import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Provider } from '@nestjs/common';

import { DiscoveryModule } from './discovery/discovery.module';
import { GrpcClientFactory } from './grpc/grpc-client.factory';

import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';
import { GrpcTimeoutInterceptor } from './grpc/grpc-timeout.interceptor';
import { GrpcErrorInterceptor } from './grpc/grpc-error.interceptor';
import { HelloController } from './http/hello-srv/hello.controller';
import { AuthController } from './http/auth-srv/auth.controller';
import { JwtAuthGuard } from './guards/JwtAuthGuard';

const globalProviders: Provider[] = [
  { provide: APP_INTERCEPTOR, useClass: GrpcMetadataInterceptor },
  { provide: APP_INTERCEPTOR, useClass: GrpcTimeoutInterceptor },
  { provide: APP_INTERCEPTOR, useClass: GrpcErrorInterceptor },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    JwtModule.register({
      secret: 'super-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    }),
    DiscoveryModule,
  ],
  controllers: [HelloController, AuthController],
  providers: [
    JwtAuthGuard,
    GrpcClientFactory,
    ...globalProviders,
  ],
})
export class AppModule { }
