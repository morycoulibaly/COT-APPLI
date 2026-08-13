import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import dns from 'node:dns';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité : on ne fait confiance qu'aux champs déclarés dans les DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  dns.setDefaultResultOrder('ipv4first');

  app.enableCors({credentials: true});

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
}
bootstrap();
