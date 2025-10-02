import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';

async function bootstrap() {
  const port = Number(process.env.GATEWAY_HTTP_PORT ?? 8080);
  const app = await NestFactory.create(AppModule);
  await app.listen(port);
  console.log(`[gateway] HTTP on ${port}`);
}
bootstrap();
