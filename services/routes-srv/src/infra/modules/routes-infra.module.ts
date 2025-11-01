// src/infra/modules/routes-infra.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteEntity } from '../persistence/typeorm/entities/route.entity';
import { TripEntity } from '../persistence/typeorm/entities/trip.entity';
import { TypeOrmRouteRepository } from '../persistence/typeorm/repositories/typeorm-route.repository';
import { TypeOrmTripRepository } from '../persistence/typeorm/repositories/typeorm-trip.repository';
import { TOKENS } from '../../application/tokens';

@Module({
    imports: [
        TypeOrmModule.forFeature([RouteEntity, TripEntity])
    ],
    providers: [
        TypeOrmRouteRepository,
        TypeOrmTripRepository,
        { provide: TOKENS.RouteRepository, useClass: TypeOrmRouteRepository },
        { provide: TOKENS.TripRepository, useClass: TypeOrmTripRepository },
    ],
    exports: [
        TOKENS.RouteRepository,
        TOKENS.TripRepository,
    ],
})
export class RoutesInfraModule {}
