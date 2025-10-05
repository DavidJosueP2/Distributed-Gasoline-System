import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Provider } from '@nestjs/common';

import { DiscoveryModule } from './discovery/discovery.module';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';
import { GrpcTimeoutInterceptor } from './grpc/grpc-timeout.interceptor';
import { GrpcErrorInterceptor } from './grpc/grpc-error.interceptor';

import { HelloController } from './http/hello-srv/hello.controller';
import { DriverLicensesController } from './http/driverms/driver-licenses/driver-licenses.controller';
import { DriversController } from './http/driverms/drivers/drivers.controller';
import { LicenseTypesController } from './http/driverms/license-types/license-types.controller';
import { UsersController } from './http/users-srv/users.controller';
import { AuthController } from './http/auth-srv/auth.controller';
import { JwtAuthGuard } from './common/auth/guards/jwt.auth.guard';

const globalProviders: Provider[] = [
  { provide: APP_INTERCEPTOR, useClass: GrpcMetadataInterceptor },
  { provide: APP_INTERCEPTOR, useClass: GrpcTimeoutInterceptor },
  { provide: APP_INTERCEPTOR, useClass: GrpcErrorInterceptor },
  { provide: APP_GUARD, useClass: JwtAuthGuard },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
    DiscoveryModule,
  ],
  controllers: [
    HelloController,
    DriverLicensesController,
    DriversController,
    LicenseTypesController,
    UsersController,
    AuthController
  ],
  providers: [
    GrpcClientFactory,
    ...globalProviders
  ],
})
export class AppModule { }