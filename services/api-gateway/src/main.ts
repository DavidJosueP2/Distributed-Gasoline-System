import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const port = Number(process.env.GATEWAY_HTTP_PORT ?? 8080);
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(port);
    console.log(`[gateway] HTTP on ${port}`);
}
bootstrap();