import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { DiscoveryModule } from './discovery/discovery.module';
import { GrpcClientFactory } from './grpc/grpc-client.factory';

import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';
import { GrpcTimeoutInterceptor } from './grpc/grpc-timeout.interceptor';
import { GrpcErrorInterceptor } from './grpc/grpc-error.interceptor';
import { HelloController } from './http/hello-srv/hello.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
        }),
        DiscoveryModule,
    ],
    controllers: [ HelloController],
    providers: [
        GrpcClientFactory,
        { provide: APP_INTERCEPTOR, useClass: GrpcMetadataInterceptor },
        { provide: APP_INTERCEPTOR, useClass: GrpcTimeoutInterceptor },
        { provide: APP_INTERCEPTOR, useClass: GrpcErrorInterceptor },
    ],
})
export class AppModule {}
