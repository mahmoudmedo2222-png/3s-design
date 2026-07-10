import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { users } from '@3s-design/db/schema';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { AuthUser, RequestWithUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      const [user] = await this.database
        .requireDb()
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('Invalid bearer token');
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private extractToken(request: RequestWithUser) {
    const authorization = request.headers.authorization;
    const value = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!value) {
      return undefined;
    }

    const [type, token] = value.split(' ');
    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
