import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@src/app.module';
import type { AppConfig } from '@src/config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    forceCloseConnections: true,
  });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService<AppConfig, true>);

  const apiPrefix = config.get('apiPrefix', { infer: true });

  app.setGlobalPrefix(apiPrefix);
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('corsOrigins', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Auto-generated OpenAPI docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Job Board Platform API')
    .setDescription(
      'Recruitment Board Portal backend (NestJS + MikroORM + PostgreSQL)',
    )
    .setVersion('1.0')
    .addCookieAuth(config.get('cookie', { infer: true }).name)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // Listen for shutdown hooks so the MikroORM connection closes cleanly.
  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);
}
void bootstrap();
