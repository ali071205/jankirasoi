import * as fs from 'fs';
import * as path from 'path';

// Authoritative local environment loader to override inherited shell variables
function loadLocalEnv() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
    }
  }
}
loadLocalEnv();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'https://jankirasoi.in'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Razorpay-Signature', 'X-Simulated-Role'],
  });

  // Global Exception Filter (RFC 7807)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Janki Rasoi Platform API')
    .setDescription(
      'Authoritative REST API for Janki Rasoi Tiffin Ordering, Kitchen KDS, and Delivery Operations.',
    )
    .setVersion('1.0.0')
    .addTag('Catalog', 'Public menu catalog and portion variants')
    .addTag('Delivery Zones', 'Pincode validation and delivery fee computation')
    .addTag('Delivery Slots', 'Delivery windows and capacity management')
    .addTag('Checkout', 'Authoritative quotations and atomic order placement')
    .addTag('Payments', 'Razorpay Standard Checkout verification and refunds')
    .addTag('Orders Tracking', 'Public order tracking by secret token')
    .addTag('Admin Orders', 'Kitchen KDS lifecycle management and rider dispatch')
    .addTag('Rider Operations', 'Mobile handover and 6-digit cryptographic OTP verification')
    .addTag('Health', 'Kubernetes / Render liveness and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Janki Rasoi API is running on http://localhost:${port}/api/v1`);
  logger.log(`📖 OpenAPI Swagger Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
