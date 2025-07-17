import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';

export function setupSwagger(app: INestApplication) {
  const theme = new SwaggerTheme();
  const draculaTheme = theme.getBuffer(SwaggerThemeNameEnum.DRACULA);

  const config = new DocumentBuilder()
    .setTitle('Api of Dreams Documentation')
    .setDescription('Documentação das rotas da API NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document, {
    customCss: draculaTheme,
  });
}
