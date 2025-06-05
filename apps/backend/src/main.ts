import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // Global prefix
  const globalPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(globalPrefix);

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000').split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  // Swagger API Documentation
  const enableSwagger = configService.get<boolean>('ENABLE_SWAGGER', true);
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('IT Support Tools Platform API')
      .setDescription('Comprehensive API for automated IT support management system')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management operations')
      .addTag('Admin', 'Administrative operations')
      .addTag('Inventory', 'Asset and inventory management')
      .addTag('Warehouse', 'Warehouse operations')
      .addTag('Requests', 'Request management and workflows')
      .addTag('Issues', 'Bug tracking and issue management')
      .addTag('Versions', 'Version and release management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // Start server
  const port = configService.get<number>('API_PORT', 3001);
  const host = configService.get<string>('API_HOST', 'localhost');
  
  await app.listen(port, host);
  
  console.log(`🚀 IT Support Platform API is running on: http://${host}:${port}/${globalPrefix}`);
  if (enableSwagger) {
    console.log(`📚 Swagger documentation available at: http://${host}:${port}/${globalPrefix}/docs`);
  }
}

bootstrap();
