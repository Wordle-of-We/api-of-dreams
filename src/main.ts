import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://panel-dreamdle.vercel.app',
      'http://liara.picos.ifpi.edu.br',
      'https://wordle-of-dreams-sandy.vercel.app',
      'https://panel-dreamdle-avelar-rodrigues-de-sousas-projects.vercel.app',
      'https://wordle-of-dreams-avelar-rodrigues-de-sousas-projects.vercel.app'
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API of Dreams')
    .setDescription('Documentação da API of Dreams')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  writeFileSync(
    process.cwd() + '/swagger.json',
    JSON.stringify(swaggerDocument, null, 2),
  );
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server rodando em http://localhost:${port}`);
  console.log(`📚 Docs disponíveis em http://localhost:${port}/api/docs`);
}

bootstrap();
