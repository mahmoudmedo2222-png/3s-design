import 'reflect-metadata';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

function isAllowedCorsOrigin(origin: string | undefined, configuredOrigins: string[]) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const isDevPort = url.port === '3000' || url.port === '8080';
    const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isPrivateLan =
      url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);

    return isDevPort && (isLocalHost || isPrivateLan);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));

  const config = app.get(ConfigService);
  const configuredOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin, configuredOrigins));
    },
    credentials: true,
  });
  await app.register(helmet);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const port = config.get<number>('PORT', 4000);
  const host = config.get<string>('HOST', '0.0.0.0');

  await app.listen({ port, host });
}

void bootstrap();
