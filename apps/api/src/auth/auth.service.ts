import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { auditLogs, authSessions, authVerificationTokens, rateLimitEvents, users } from '@3s-design/db/schema';
import bcrypt from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { englishEmailMessage, isEnglishEmail, normalizeEmail } from './email-policy';
import { assertStrongPassword } from './password-policy';

type AuthContext = {
  ipAddress?: string;
  userAgent?: string;
};

type Uuid = `${string}-${string}-${string}-${string}-${string}`;

type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
};

const loginWindowMs = 15 * 60 * 1000;
const maxFailedLogins = 5;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto, context: AuthContext = {}) {
    const db = this.database.requireDb();
    const email = this.normalizeEnglishEmail(input.email);
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

    if (existing.length) {
      throw new ConflictException('Email already exists');
    }

    assertStrongPassword(input.password);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        email,
        fullName: input.fullName,
        passwordHash,
        role: 'customer',
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
      });

    if (!created) {
      throw new InternalServerErrorException('User registration failed');
    }

    await this.recordAudit(created.id, 'auth.register', 'user', created.id);
    const verification = await this.createVerificationToken(created.id, 'email_verification');

    return {
      ...(await this.createAuthResponse(created, context)),
      emailVerificationRequired: true,
      devEmailVerificationToken: this.includeDevTokens() ? verification.token : undefined,
    };
  }

  async login(input: LoginDto, context: AuthContext = {}) {
    const db = this.database.requireDb();
    const email = this.normalizeEnglishEmail(input.email);
    await this.assertLoginAllowed(email);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || user.deletedAt) {
      await this.recordLoginFailure(email, undefined, context);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordOk) {
      await this.recordLoginFailure(email, user.id, context);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.recordAudit(user.id, 'auth.login', 'user', user.id);

    return this.createAuthResponse(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      context,
    );
  }

  async refresh(input: RefreshTokenDto, context: AuthContext = {}) {
    const db = this.database.requireDb();
    const tokenHash = this.hashToken(input.refreshToken);
    const [session] = await db.select().from(authSessions).where(eq(authSessions.refreshTokenHash, tokenHash)).limit(1);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt || session.replacedBySessionId) {
      await this.revokeSessionFamily(session.familyId, 'auth.refresh_reuse_detected');
      throw new UnauthorizedException('Refresh token was already used');
    }

    if (session.expiresAt <= new Date()) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isEmailVerified: users.isEmailVerified,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || user.deletedAt) {
      await this.revokeSessionFamily(session.familyId, 'auth.refresh_user_invalid');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const next = await this.createSession(user.id, context, session.familyId);
    await db
      .update(authSessions)
      .set({
        revokedAt: new Date(),
        replacedBySessionId: next.sessionId,
        updatedAt: new Date(),
      })
      .where(eq(authSessions.id, session.id));

    return {
      user: this.serializeUser(user),
      accessToken: await this.signAccessToken(user.id, user.email, user.role),
      refreshToken: next.refreshToken,
      refreshTokenExpiresAt: next.expiresAt.toISOString(),
    };
  }

  async logout(input: { refreshToken?: string }) {
    if (!input.refreshToken) {
      return { loggedOut: true };
    }

    const tokenHash = this.hashToken(input.refreshToken);
    const [session] = await this.database
      .requireDb()
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(eq(authSessions.refreshTokenHash, tokenHash))
      .limit(1);

    if (session) {
      await this.revokeSession(session.id);
    }

    return { loggedOut: true };
  }

  async logoutAll(userId: string) {
    await this.database
      .requireDb()
      .update(authSessions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));

    await this.recordAudit(userId, 'auth.logout_all', 'user', userId);
    return { loggedOut: true };
  }

  async requestEmailVerification(userId: string) {
    const token = await this.createVerificationToken(userId, 'email_verification');
    return {
      sent: true,
      devEmailVerificationToken: this.includeDevTokens() ? token.token : undefined,
    };
  }

  async verifyEmail(input: VerifyEmailDto) {
    const token = await this.consumeVerificationToken(input.token, 'email_verification');
    await this.database.requireDb().update(users).set({ isEmailVerified: true, updatedAt: new Date() }).where(eq(users.id, token.userId));

    await this.recordAudit(token.userId, 'auth.email_verified', 'user', token.userId);
    return { verified: true };
  }

  async requestPasswordReset(input: RequestPasswordResetDto) {
    const email = this.normalizeEnglishEmail(input.email);
    const [user] = await this.database.requireDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return { sent: true };
    }

    const token = await this.createVerificationToken(user.id, 'password_reset');
    await this.recordAudit(user.id, 'auth.password_reset_requested', 'user', user.id);

    return {
      sent: true,
      devPasswordResetToken: this.includeDevTokens() ? token.token : undefined,
    };
  }

  async resetPassword(input: ResetPasswordDto) {
    const token = await this.consumeVerificationToken(input.token, 'password_reset');
    assertStrongPassword(input.password);
    const passwordHash = await bcrypt.hash(input.password, 12);

    await this.database.requireDb().update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, token.userId));

    await this.logoutAll(token.userId);
    await this.recordAudit(token.userId, 'auth.password_reset_completed', 'user', token.userId);
    return { reset: true };
  }

  private async createAuthResponse(user: AuthenticatedUser, context: AuthContext) {
    const session = await this.createSession(user.id, context);

    return {
      user: this.serializeUser(user),
      accessToken: await this.signAccessToken(user.id, user.email, user.role),
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt.toISOString(),
    };
  }

  private async createSession(userId: string, context: AuthContext, familyId: string = randomUUID()) {
    const refreshToken = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs());
    const [session] = await this.database
      .requireDb()
      .insert(authSessions)
      .values({
        userId: userId as Uuid,
        familyId: familyId as Uuid,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: context.userAgent,
        ipAddress: this.safeIp(context.ipAddress),
        expiresAt,
      })
      .returning({ id: authSessions.id });

    if (!session) {
      throw new InternalServerErrorException('Session creation failed');
    }

    return {
      sessionId: session.id,
      refreshToken,
      expiresAt,
    };
  }

  private async createVerificationToken(userId: string, purpose: string) {
    const token = this.createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.verificationTokenTtlMs(purpose));

    await this.database
      .requireDb()
      .insert(authVerificationTokens)
      .values({
        userId,
        purpose,
        tokenHash: this.hashToken(token),
        expiresAt,
      });

    return { token, expiresAt };
  }

  private async consumeVerificationToken(token: string, purpose: string) {
    const db = this.database.requireDb();
    const [row] = await db
      .select()
      .from(authVerificationTokens)
      .where(
        and(
          eq(authVerificationTokens.tokenHash, this.hashToken(token)),
          eq(authVerificationTokens.purpose, purpose),
          isNull(authVerificationTokens.usedAt),
          gt(authVerificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await db.update(authVerificationTokens).set({ usedAt: new Date() }).where(eq(authVerificationTokens.id, row.id));

    return row;
  }

  private async assertLoginAllowed(email: string) {
    const now = Date.now();
    const windowStart = new Date(now - loginWindowMs);
    const failures = await this.database
      .requireDb()
      .select({ id: rateLimitEvents.id })
      .from(rateLimitEvents)
      .where(
        and(
          eq(rateLimitEvents.key, this.loginRateLimitKey(email)),
          eq(rateLimitEvents.action, 'auth.login_failed'),
          gt(rateLimitEvents.windowEnd, windowStart),
        ),
      );

    if (failures.length >= maxFailedLogins) {
      throw new HttpException('Too many failed login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordLoginFailure(email: string, userId: string | undefined, context: AuthContext) {
    const now = new Date();
    await this.database
      .requireDb()
      .insert(rateLimitEvents)
      .values({
        userId,
        key: this.loginRateLimitKey(email),
        action: 'auth.login_failed',
        count: 1,
        windowStart: new Date(now.getTime() - loginWindowMs),
        windowEnd: new Date(now.getTime() + loginWindowMs),
      });

    if (userId) {
      await this.recordAudit(userId, 'auth.login_failed', 'user', userId, {
        ipAddress: context.ipAddress,
      });
    }
  }

  private async revokeSession(sessionId: string) {
    await this.database
      .requireDb()
      .update(authSessions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }

  private async revokeSessionFamily(familyId: string, action: string) {
    await this.database
      .requireDb()
      .update(authSessions)
      .set({ revokedAt: new Date(), reuseDetectedAt: new Date(), updatedAt: new Date() })
      .where(eq(authSessions.familyId, familyId as Uuid));

    await this.recordAudit(undefined, action, 'auth_session_family', familyId);
  }

  private async recordAudit(
    actorUserId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    after?: Record<string, unknown>,
  ) {
    await this.database.requireDb().insert(auditLogs).values({
      actorUserId,
      action,
      entityType,
      entityId,
      after,
    });
  }

  private serializeUser(user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private normalizeEnglishEmail(value: string) {
    const email = normalizeEmail(value);
    if (!isEnglishEmail(email)) {
      throw new BadRequestException(englishEmailMessage);
    }

    return email;
  }

  private signAccessToken(id: string, email: string, role: string) {
    return this.jwt.signAsync({ id, email, role });
  }

  private createOpaqueToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenTtlMs() {
    const days = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS', '30'));
    return Math.max(days, 1) * 24 * 60 * 60 * 1000;
  }

  private verificationTokenTtlMs(purpose: string) {
    return purpose === 'password_reset' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  }

  private includeDevTokens() {
    return this.config.get<string>('NODE_ENV', 'development') !== 'production';
  }

  private loginRateLimitKey(email: string) {
    return `email:${email}`;
  }

  private safeIp(value: string | undefined) {
    if (!value || value.includes(',')) {
      return undefined;
    }

    return value;
  }
}
