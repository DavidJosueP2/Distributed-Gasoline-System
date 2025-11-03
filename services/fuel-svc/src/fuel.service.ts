import { Injectable } from '@nestjs/common';
import {
    GenerateGeneralReportRequest,
    type GenerateGeneralReportResponse,
    type GenerateVehicleDetailReportRequest,
    type GenerateVehicleDetailReportResponse,
    type VehicleDetailSummary,
    type GenerateVehicleRoutesReportRequest,
    type GenerateVehicleRoutesReportResponse,
    type RouteDetailSummary,
} from './dto/fuel.dto';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { VehicleType } from './types/routes-client';
import { safeGrpcCall } from './common/auth/utils/grpc-call.util';
import { Metadata } from '@grpc/grpc-js';
import type {
    RoutesServiceClient,
    GetRoutesByVehicleAndStatusRequest,
} from './types/routes-client';
import type { DriversServiceClient } from './types/driver-client';
import {
    ListTripsByTimeRangeRequest,
    TripStatus,
    type TripsServiceClient,
    VehicleType as TripVehicleType,
    type ListTripsByVehicleTypeRequest,
} from './types/trips-client';
import { VehiclesServiceClient } from './types/vehicle-client';

@Injectable()
export class FuelService {
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

    private async vehiclesClient(): Promise<VehiclesServiceClient> {
        const client = await this.grpcClientFactory.clientFor(
            'VEHICLES-SERVICE',
            'vehicles.v1',
            'vehicles.proto',
        );
        return client.getService<VehiclesServiceClient>('VehiclesService');
    }

    public async generateGeneralReport(
        data: GenerateGeneralReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateGeneralReportResponse> {
        const tripsClient = await this.tripsClient();

        const startTimeStr = this.formatDateToYYYYMMDD(data.startDate);
        const endTimeStr = this.formatDateToYYYYMMDD(data.endDate);

        const request: ListTripsByTimeRangeRequest = {
            startTime: startTimeStr,
            endTime: endTimeStr,
        };

        // Obtener todos los viajes en el rango de fechas usando el método optimizado
        const { trips: allTripsInRange, totalTrips } = await safeGrpcCall(
            tripsClient.ListTripsByTimeRange(request, metadata),
            'FuelService.ListTripsByTimeRange',
        );

        if (Number(totalTrips) === 0) {
            return {
                LIGHT: { estimated: 0, actual: 0 },
                HEAVY: { estimated: 0, actual: 0 },
                ANY: { estimated: 0, actual: 0 },
            };
        }

        // Filtrar solo los viajes TERMINADOS
        const filteredTrips = allTripsInRange.filter(
            (trip) => trip.status === TripStatus.TERMINADO,
        );

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
            [VehicleType.LIVIANO]: { estimated: 0, actual: 0 },
            [VehicleType.PESADO]: { estimated: 0, actual: 0 },
            [VehicleType.CUALQUIERA]: { estimated: 0, actual: 0 },
        };

        for (let i = 0; i < filteredTrips.length; i++) {
            const trip = filteredTrips[i];
            const route = routeResponses[i].route;
            const type = route.vehicleType ?? VehicleType.CUALQUIERA;

            fuelTotals[type].estimated += trip.fuelEstimated || 0;
            fuelTotals[type].actual += trip.fuelActual || 0;
        }

        return {
            LIGHT: fuelTotals[VehicleType.LIVIANO],
            HEAVY: fuelTotals[VehicleType.PESADO],
            ANY: fuelTotals[VehicleType.CUALQUIERA],
        };
    }

    public async generateVehicleDetailReport(
        data: GenerateVehicleDetailReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleDetailReportResponse> {
        // Obtener todos los viajes del tipo de vehículo
        const tripsClient = await this.tripsClient();
        const tripsRequest: ListTripsByVehicleTypeRequest = {
            vehicleTypeFilter: data.vehicleType,
        };

        const { trips: segmentedTrips, totalTrips } = await safeGrpcCall(
            tripsClient.ListTripsByVehicleType(tripsRequest, metadata),
            'FuelService.ListTripsByVehicleType',
        );

        console.log('totalTrips', totalTrips);
        console.log('segmentedTrips', segmentedTrips);

        // Combinar todos los viajes del tipo solicitado
        let allTrips: typeof segmentedTrips.LIVIANO = [];
        if (data.vehicleType === TripVehicleType.LIVIANO) {
            allTrips = segmentedTrips.LIVIANO || [];
        } else if (data.vehicleType === TripVehicleType.PESADO) {
            allTrips = segmentedTrips.PESADO || [];
        } else if (data.vehicleType === TripVehicleType.CUALQUIERA) {
            allTrips = segmentedTrips.CUALQUIERA || [];
        }

        if (Number(totalTrips) === 0 || allTrips.length === 0) {
            return { vehicles: [] };
        }

        // Filtrar solo TERMINADOS
        const filteredTrips = allTrips.filter(
            (trip) => trip.status === TripStatus.TERMINADO,
        );

        if (filteredTrips.length === 0) {
            return { vehicles: [] };
        }

        // Agrupar viajes por vehicleId y calcular métricas
        const vehicleMap = new Map<number, VehicleDetailSummary>();

        // Procesar viajes y agrupar por vehículo
        for (const trip of filteredTrips) {
            const vehicleId = Number(trip.vehicleId);

            if (!vehicleMap.has(Number(vehicleId))) {
                vehicleMap.set(Number(vehicleId), {
                    vehicleId,
                    trips: 0,
                    estimated: 0,
                    actual: 0,
                    difference: 0,
                    efficiency: 0,
                });
            }

            const summary = vehicleMap.get(Number(vehicleId))!;
            summary.trips += 1;
            summary.estimated += trip.fuelEstimated || 0;
            summary.actual += trip.fuelActual || 0;
        }

        // Calcular diferencia y eficiencia para cada vehículo
        const vehicleSummaries: VehicleDetailSummary[] = [];
        for (const summary of vehicleMap.values()) {
            summary.difference = summary.actual - summary.estimated;
            // Eficiencia = (estimado / real) * 100, si real > 0
            summary.efficiency =
                summary.actual > 0
                    ? (summary.estimated / summary.actual) * 100
                    : 0;

            vehicleSummaries.push(summary);
        }

        // Ordenar por vehicleId
        vehicleSummaries.sort(
            (a, b) => Number(a.vehicleId) - Number(b.vehicleId),
        );

        console.log('Vehicle summaries', vehicleSummaries);

        return { vehicles: vehicleSummaries };
    }

    public async generateVehicleRoutesReport(
        data: GenerateVehicleRoutesReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleRoutesReportResponse> {
        const routesClient = await this.routesClient();

        const request: GetRoutesByVehicleAndStatusRequest = {
            vehicleId: Number(data.vehicleId),
            status: data.status,
            vehicleType: data.vehicleType,
        };

        const { totalRoutes, totalTrips, routes } = await safeGrpcCall(
            routesClient.GetRoutesByVehicleAndStatus(request, metadata),
            'FuelService.GetRoutesByVehicleAndStatus',
        );

        if (Number(totalRoutes) === 0 || Number(totalTrips) === 0) {
            return { routes: [] };
        }

        // Mapear cada ruta con sus viajes a RouteDetailSummary
        const routeDetails: RouteDetailSummary[] = routes.map(
            (routeWithTrips) => {
                const route = routeWithTrips.route;
                const trips = routeWithTrips.trips || [];

                // Sumar consumos de todos los viajes de esta ruta
                let totalEstimated = 0;
                let totalActual = 0;

                for (const trip of trips) {
                    totalEstimated += trip.fuelEstimated || 0;
                    totalActual += trip.fuelActual || 0;
                }

                const difference = totalActual - totalEstimated;
                // Desviación porcentual: ((actual - estimado) / estimado) * 100
                /* const deviation =
                    totalEstimated > 0
                        ? (difference / totalEstimated) * 100
                        : 0; */

                return {
                    routeId: route.id,
                    routeName:
                        route.name || `R${String(route.id).padStart(3, '0')}`,
                    originName: route.originName,
                    destinationName: route.destinationName,
                    estimated: totalEstimated,
                    actual: totalActual,
                    difference: difference,
                    //deviation: deviation,
                    trips: trips.map((trip) => ({
                        id: trip.id,
                        fuelEstimated: trip.fuelEstimated,
                        fuelActual: trip.fuelActual,
                        difference: trip.fuelActual
                            ? trip.fuelActual - trip.fuelEstimated
                            : 0,
                    })),
                };
            },
        );

        // Ordenar por routeId
        routeDetails.sort((a, b) => a.routeId - b.routeId);

        return { routes: routeDetails };
    }

    /**
     * Convierte una fecha (string o Date) al formato YYYY-MM-DD requerido por ListTripsByTimeRange
     */
    private formatDateToYYYYMMDD(dateInput: string | Date): string {
        const date =
            typeof dateInput === 'string'
                ? new Date(dateInput + 'T00:00:00Z') // Fuerza UTC
                : dateInput;
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
