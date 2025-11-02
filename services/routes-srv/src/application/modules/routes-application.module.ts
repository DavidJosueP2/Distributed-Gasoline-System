// src/application/modules/routes-application.module.ts
import { Module } from '@nestjs/common';
import { RoutesInfraModule } from '../../infra/modules/routes-infra.module';
import { RouteService } from '../services/route.service';
import { TripService } from '../services/trip.service';
import { GrpcClientFactory } from '../../infra/grpc/grpc-client.factory';
import { DiscoveryModule } from '../../infra/discovery/discovery.module';

@Module({
    imports: [
        RoutesInfraModule,
        DiscoveryModule,
    ],
    providers: [
        GrpcClientFactory,
        RouteService,
        TripService,
    ],
    exports: [
        GrpcClientFactory,
        RouteService,
        TripService,
    ],
})
export class RoutesApplicationModule {}
