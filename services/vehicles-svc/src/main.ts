import 'reflect-metadata';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { AppModule } from './app.module';
import { registerInEureka } from './infra/discovery/eureka-register';
import { flattenValidationErrors } from './infra/validation/field-error.util';

@Module({ imports: [ AppModule]})

class VehiclesBootstrapModule {}

async function bootstrap() {
    const PORT = Number(process.env.VEHICLES_GRPC_PORT || process.env.GRPC_PORT || 50055);
    const BIND_HOST = process.env.SERVICE_BIND_HOST || process.env.BIND_HOST || '0.0.0.0';
    const PROTO_ROOT = process.env.PROTO_ROOT || process.env.PROTOS_DIR || './protos';
    const APP_NAME = process.env.VEHICLES_APP_NAME || 'VEHICLES-SERVICE';
    const SHOULD_REGISTER =
        (process.env.DISCOVERY_MODE || '').toLowerCase() === 'eureka' ||
        (process.env.EUREKA_ENABLED || '').toLowerCase() === 'true';

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(VehiclesBootstrapModule, {
        transport: Transport.GRPC,
        options: {
            package: 'vehicles.v1',
            protoPath: join(PROTO_ROOT, 'vehicles.proto'),
            url: `${BIND_HOST}:${PORT}`,
            loader: {
                longs: String,   // int64 como string
                enums: String,   // enums como 'LIGHT' | 'HEAVY'
                defaults: false,
                arrays: true,
                objects: true,
                oneofs: true,
            },
        },
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors) => {
            const fieldErrors = flattenValidationErrors(errors as any);
            return new RpcException({
                code: GrpcStatus.INVALID_ARGUMENT,
                message: 'Validation failed',
                details: JSON.stringify({ fieldErrors }),
            });
        },
    }));

    const eureka = SHOULD_REGISTER ? registerInEureka() : undefined;

    await app.listen();
    console.log(`[${APP_NAME}] gRPC on ${BIND_HOST}:${PORT}`);

    const stop = async () => {
        try { await app.close(); } catch {}
        try { (eureka as any)?.stop?.(); } catch {}
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}

bootstrap();
