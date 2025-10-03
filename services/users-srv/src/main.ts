import 'reflect-metadata';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, RpcException, Transport } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AppModule } from './app.module';
import { flattenValidationErrors } from './validation/field-error.util';
import { registerInEureka } from './discovery/eureka-register';
import { RpcExceptionFromValidationErrors } from './application/exceptions/RpcExceptionFromValidationErrors';

async function bootstrap() {
  const PORT = Number(
    process.env.USERS_GRPC_PORT || process.env.GRPC_PORT || 50057,
  );
  const BIND_HOST =
    process.env.SERVICE_BIND_HOST || process.env.BIND_HOST || '0.0.0.0';
  const PROTO_ROOT = process.env.PROTO_ROOT || process.env.PROTOS_DIR || './protos';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: join(PROTO_ROOT, 'users.proto'),
      url: `${BIND_HOST}:${PORT}`,
    },
  });

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) => {
      
      return RpcExceptionFromValidationErrors(errors);
    },
  }),
);
  const eureka = registerInEureka();

  await app.listen();
  console.log(`[USERS-SERVICE] gRPC on ${BIND_HOST}:${PORT}`);

  const stop = async () => {
    try {
      await app.close();
    } catch {}
    try {
      (eureka as any)?.stop?.();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

bootstrap();
