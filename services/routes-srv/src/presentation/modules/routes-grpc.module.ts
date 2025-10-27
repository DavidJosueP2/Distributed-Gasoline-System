// src/presentation/modules/routes-grpc.module.ts
import { Module } from '@nestjs/common';
import { RoutesApplicationModule } from '../../application/modules/routes-application.module';
import { RoutesController } from '../grpc/routes.controller';
import { TripsController } from '../grpc/trips.controller';

@Module({
    imports: [RoutesApplicationModule],
    controllers: [RoutesController, TripsController],
})
export class RoutesGrpcModule {}
