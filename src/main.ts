import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from '../config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.use(cookieParser())

  const isProd = process.env.NODE_ENV === 'production'
  app.enableCors({
    origin: isProd
      ? [
          'https://panel‑dreamdle.vercel.app',
          'http://liara.picos.ifpi.edu.br'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:3001',
        ],
    credentials: true,
    allowedHeaders: ['Content-Type','Authorization'],
    exposedHeaders: ['Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  console.log(`🚀 Server rodando em http://localhost:${port}`);
  console.log(`📚 Docs disponíveis em http://localhost:${port}/api/docs`);
}

bootstrap();
