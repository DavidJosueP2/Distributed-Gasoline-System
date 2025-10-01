import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './guards/JwtAuthGuard';
import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';

async function bootstrap() {
  const port = Number(process.env.GATEWAY_HTTP_PORT ?? 8080);
  const app = await NestFactory.create(AppModule);
  app.useGlobalGuards(app.get(JwtAuthGuard));
  //app.useGlobalInterceptors(app.get(GrpcMetadataInterceptor));
  await app.listen(port);
  console.log(`[gateway] HTTP on ${port}`);
}
bootstrap();
