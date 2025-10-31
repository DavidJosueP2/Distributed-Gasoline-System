import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { join } from 'path';

import { AuthModule } from './auth.module';
import { flattenValidationErrors } from './validation/field-error.util';
import { registerInEureka } from './discovery/eureka-register';


async function bootstrap() {
  const PORT = Number(process.env.AUTH_GRPC_PORT || 50052);
  const BIND_HOST = process.env.AUTH_SERVICE_REGISTER_HOST || '0.0.0.0';
  const PROTO_ROOT = join(__dirname, '../../../protos');
    const SHOULD_REGISTER =
        (process.env.DISCOVERY_MODE || '').toLowerCase() === 'eureka' ||
        (process.env.EUREKA_ENABLED || '').toLowerCase() === 'true';


  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: join(PROTO_ROOT, 'auth.proto'),
        url: `${BIND_HOST}:${PORT}`,
      },
    },
  );

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const fieldErrors = flattenValidationErrors(errors);
        return new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: 'Validation failed',
          details: JSON.stringify({ fieldErrors }),
        });
      },
    }),
  );

  const eureka = SHOULD_REGISTER ? registerInEureka() : undefined

  await app.listen();
  console.log(`[AUTH-SERVICE] gRPC on ${BIND_HOST}:${PORT}`);

  // Shutdown ordenado
  const stop = async () => {
    try {
      await app.close();
    } catch { }
    try {
      (eureka as any)?.stop?.();
    } catch { }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
bootstrap();
