import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { Module, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { HelloModule } from './hello.module';
import { flattenValidationErrors } from './validation/field-error.util';
import {registerInEureka} from "./discovery/eureka-register";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['../../.env'], // solo .env central
        }),
        HelloModule,
    ],
})
class AppModule {}

async function bootstrap() {
    const PORT = Number(process.env.HELLO_GRPC_PORT || process.env.GRPC_PORT || 50051);
    const BIND_HOST = process.env.SERVICE_BIND_HOST || process.env.BIND_HOST || '0.0.0.0';
    const PROTO_ROOT = process.env.PROTO_ROOT || process.env.PROTOS_DIR || './protos';
    const SHOULD_REGISTER =
        (process.env.DISCOVERY_MODE || '').toLowerCase() === 'eureka' ||
        (process.env.EUREKA_ENABLED || '').toLowerCase() === 'true';

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.GRPC,
        options: {
            package: 'hello',
            protoPath: join(PROTO_ROOT, 'hello.proto'),
            url: `${BIND_HOST}:${PORT}`,
        },
    });

    app.useGlobalPipes(new ValidationPipe({
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
    }));

    const eureka = SHOULD_REGISTER ? registerInEureka() : undefined;

    await app.listen();
    console.log(`[HELLO-SERVICE] gRPC on ${BIND_HOST}:${PORT}`);

    const stop = async () => {
        try { await app.close(); } catch {}
        try { (eureka as any)?.stop?.(); } catch {}
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}
bootstrap();
