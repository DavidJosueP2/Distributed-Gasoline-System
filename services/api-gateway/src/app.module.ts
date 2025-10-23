import { Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DiscoveryModule } from './discovery/discovery.module';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { GrpcMetadataInterceptor } from './grpc/grpc-metadata.interceptor';
import { GrpcTimeoutInterceptor } from './grpc/grpc-timeout.interceptor';
import { GrpcErrorInterceptor } from './grpc/grpc-error.interceptor';

import { HelloController } from './http/hello-srv/hello.controller';
import { DriversHttpController } from './http/drivers-svc/drivers.controller';
import { LicenseTypesHttpController } from './http/drivers-svc/license-types.controller';
import { DriverLicensesHttpController } from './http/drivers-svc/driver-licenses.controller';
import { VehicleModelsHttpController } from './http/vehicles-svc/vehicle-models.controller';
import { VehicleUnitsHttpController } from './http/vehicles-svc/vehicle-units.controller';
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

        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const raw = config.get<string>('JWT_EXPIRES_IN') ?? '15m';

                const expiresIn: number | `${number}${'ms'|'s'|'m'|'h'|'d'}` =
                    /^\d+$/.test(raw) ? Number(raw) : (raw as `${number}${'ms'|'s'|'m'|'h'|'d'}`);

                return {
                    secret: config.getOrThrow<string>('JWT_SECRET'),
                    signOptions: { expiresIn },
                };
            },
        }),

        DiscoveryModule,
    ],
    controllers: [
        HelloController,
        DriversHttpController,
        LicenseTypesHttpController,
        DriverLicensesHttpController,
        VehicleModelsHttpController,
        VehicleUnitsHttpController,
        UsersController,
        AuthController,
    ],
    providers: [
        GrpcClientFactory,
        ...globalProviders,
    ],
})
export class AppModule {}