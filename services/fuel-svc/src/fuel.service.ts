import { Injectable } from '@nestjs/common';
import type {
    GenerateGeneralReportRequest,
    GenerateGeneralReportResponse,
} from './dto/fuel.dto';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { VehicleType } from './types/routes-client';
import { safeGrpcCall } from './common/auth/utils/grpc-call.util';
import { Metadata } from '@grpc/grpc-js';
import type { RoutesServiceClient } from './types/routes-client';
import type { DriversServiceClient } from './types/driver-client';
import { TripStatus, type TripsServiceClient } from './types/trips-client';

@Injectable()
export class FuelService {
    private readonly VEHICLE_TYPE_LIGHT = 'LIVIANA';
    private readonly VEHICLE_TYPE_HEAVY = 'PESADA';
    private readonly VEHICLE_TYPE_ANY = 'CUALQUIERA';

    constructor(private readonly grpcClientFactory: GrpcClientFactory) {}

    private async routesClient(): Promise<RoutesServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'ROUTES-SERVICE',
            'routes.v1',
            'routes.proto',
        );
        return client.getService<RoutesServiceClient>('RoutesService');
    }

    private async tripsClient(): Promise<TripsServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'ROUTES-SERVICE',
            'routes.v1',
            'routes.proto',
        );
        return client.getService<TripsServiceClient>('TripsService');
    }

    private async driverClient(): Promise<DriversServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'DRIVER-SERVICE',
            'drivers',
            'drivers.proto',
        );
        return client.getService<DriversServiceClient>('DriversService');
    }

    public async generateGeneralReport(
        data: GenerateGeneralReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateGeneralReportResponse> {
        const tripsClient = await this.tripsClient();

        // Obtener todos los viajes TERMINADOS
        const { trips } = await safeGrpcCall(
            tripsClient.ListTrips({ statusFilter: TripStatus.TERMINADO }),
            'FuelService.ListTrips',
        );

        const terminatedTrips = trips.terminado ?? [];
        if (terminatedTrips.length === 0) {
            return {
                LIGHT: { estimated: 0, actual: 0 },
                HEAVY: { estimated: 0, actual: 0 },
                ANY: { estimated: 0, actual: 0 },
            };
        }

        // Convertir fechas de entrada
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        // Filtrar por rango usando startTime y endTime del trip
        const filteredTrips = terminatedTrips.filter((trip) => {
            if (!trip.startTime || !trip.endTime) return false;

            const tripStart = new Date(
                typeof trip.startTime === 'string'
                    ? trip.startTime
                    : trip.startTime.seconds * 1000,
            );
            const tripEnd = new Date(
                typeof trip.endTime === 'string'
                    ? trip.endTime
                    : trip.endTime.seconds * 1000,
            );

            // El viaje cuenta si se solapa con el rango dado
            return tripEnd >= startDate && tripStart <= endDate;
        });

        if (filteredTrips.length === 0) {
            return {
                LIGHT: { estimated: 0, actual: 0 },
                HEAVY: { estimated: 0, actual: 0 },
                ANY: { estimated: 0, actual: 0 },
            };
        }

        const routesClient = await this.routesClient();

        // Consultar todas las rutas en paralelo solo para los filtrados
        const routeResponses = await Promise.all(
            filteredTrips.map((trip) =>
                safeGrpcCall(
                    routesClient.GetRoute({ id: trip.routeId }),
                    'FuelService.GetRoute',
                ),
            ),
        );

        // Acumulador de combustible por tipo
        const fuelTotals = {
            [this.VEHICLE_TYPE_LIGHT]: { estimated: 0, actual: 0 },
            [this.VEHICLE_TYPE_HEAVY]: { estimated: 0, actual: 0 },
            [this.VEHICLE_TYPE_ANY]: { estimated: 0, actual: 0 },
        };

        for (let i = 0; i < filteredTrips.length; i++) {
            const trip = filteredTrips[i];
            const route = routeResponses[i].route;
            const type = this.getMachineTypeFromVehicleType(route.vehicleType);

            fuelTotals[type].estimated += trip.fuelEstimated || 0;
            fuelTotals[type].actual += trip.fuelActual || 0;
        }

        return {
            LIGHT: fuelTotals[this.VEHICLE_TYPE_LIGHT],
            HEAVY: fuelTotals[this.VEHICLE_TYPE_HEAVY],
            ANY: fuelTotals[this.VEHICLE_TYPE_ANY],
        };
    }

    private getMachineTypeFromVehicleType(vehicleType: VehicleType): string {
        switch (vehicleType) {
            case VehicleType.LIVIANO:
                return this.VEHICLE_TYPE_LIGHT;
            case VehicleType.PESADO:
                return this.VEHICLE_TYPE_HEAVY;
            case VehicleType.CUALQUIERA:
            case VehicleType.VEHICLE_TYPE_UNSPECIFIED:
            default:
                return this.VEHICLE_TYPE_ANY;
        }
    }
}
