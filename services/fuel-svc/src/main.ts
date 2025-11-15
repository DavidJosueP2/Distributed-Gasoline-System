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
import { flattenValidationErrors } from './validation/field-error.util';
import { registerInEureka } from './discovery/eureka-register';
import { AppModule } from './fuel.module';

async function bootstrap() {
  const PORT = Number(process.env.FUEL_GRPC_PORT || 50054);
  const BIND_HOST = process.env.SERVICE_BIND_HOST || process.env.BIND_HOST || '0.0.0.0';
  const PROTO_ROOT = process.env.PROTO_ROOT || process.env.PROTOS_DIR || join(__dirname, '../../../protos');
  const SHOULD_REGISTER =
    (process.env.DISCOVERY_MODE || '').toLowerCase() === 'eureka' ||
    (process.env.EUREKA_ENABLED || '').toLowerCase() === 'true';


  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'fuel',
        protoPath: join(PROTO_ROOT, 'fuel.proto'),
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
  console.log(`[FUEL-SERVICE] gRPC on ${BIND_HOST}:${PORT}`);

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
