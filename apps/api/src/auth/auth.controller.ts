import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto, @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.register(body, this.contextFromRequest(request));
  }

  @Post('login')
  login(@Body() body: LoginDto, @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.login(body, this.contextFromRequest(request));
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto, @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    return this.auth.refresh(body, this.contextFromRequest(request));
  }

  @Post('logout')
  logout(@Body() body: LogoutDto) {
    return this.auth.logout(body);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.auth.logoutAll(user.id);
  }

  @Post('email/verification/request')
  @UseGuards(JwtAuthGuard)
  requestEmailVerification(@CurrentUser() user: AuthUser) {
    return this.auth.requestEmailVerification(user.id);
  }

  @Post('email/verify')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body);
  }

  @Post('password/reset/request')
  requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(body);
  }

  @Post('password/reset')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  private contextFromRequest(request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    const userAgent = request.headers['user-agent'];
    const forwardedFor = request.headers['x-forwarded-for'];

    return {
      ipAddress: Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor ?? request.ip),
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }
}
