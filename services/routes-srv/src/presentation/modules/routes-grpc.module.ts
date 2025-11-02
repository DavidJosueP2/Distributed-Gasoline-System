// src/presentation/modules/routes-grpc.module.ts
import { Module } from '@nestjs/common';
import { RoutesApplicationModule } from '../../application/modules/routes-application.module';
import { AuthModule } from '../../common/auth/auth.module';
import { RoutesController } from '../grpc/routes.controller';
import { TripsController } from '../grpc/trips.controller';

@Module({
    imports: [RoutesApplicationModule, AuthModule],
    controllers: [RoutesController, TripsController],
})
export class RoutesGrpcModule {}
