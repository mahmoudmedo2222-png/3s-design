import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtAccessSecret(config.get<string>('JWT_ACCESS_SECRET'), config.get<string>('NODE_ENV')),
        signOptions: {
          expiresIn: jwtTtlSeconds(config.get<string>('JWT_ACCESS_TTL', '15m')),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

export function resolveJwtAccessSecret(secret: string | undefined, nodeEnv: string | undefined) {
  const value = secret?.trim();
  const isProduction = nodeEnv === 'production';
  const unsafeDefaults = new Set(['change-me-in-production', 'dev-only-change-me']);

  if (!value) {
    if (isProduction) {
      throw new Error('JWT_ACCESS_SECRET is required in production');
    }

    return 'dev-only-change-me';
  }

  if (isProduction && (value.length < 32 || unsafeDefaults.has(value))) {
    throw new Error('JWT_ACCESS_SECRET must be a strong production secret');
  }

  return value;
}

function jwtTtlSeconds(value: string) {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 15 * 60;
  }

  const amount = Number(match[1] ?? 15);
  const unit = (match[2] ?? 'm').toLowerCase();
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 60 * 60 : 24 * 60 * 60;

  return amount * multiplier;
}
