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
    type GenerateKPIsRequest,
    type GenerateKPIsResponse,
    type GenerateDriverRankingReportRequest,
    type GenerateDriverRankingReportResponse,
    type DriverRankingSummary,
    type GetDriverTripsRequest,
    type GetDriverTripsResponse,
    type DriverTripDetail,
    type GenerateRoutesSummaryReportRequest,
    type GenerateRoutesSummaryReportResponse,
    type RouteSummary,
    type GetRouteTripsDetailRequest,
    type GetRouteTripsDetailResponse,
    type RouteTripDetail,
    type GenerateMachineryTypeReportRequest,
    type GenerateMachineryTypeReportResponse,
    type MachineryTypeSummary,
} from './dto/fuel.dto';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { VehicleType } from './types/routes-client';
import { safeGrpcCall } from './common/auth/utils/grpc-call.util';
import { Metadata } from '@grpc/grpc-js';
import type {
    RoutesServiceClient,
    GetRoutesByVehicleAndStatusRequest,
    ListRoutesRequest,
} from './types/routes-client';
import type { DriversServiceClient } from './types/driver-client';
import {
    ListTripsByTimeRangeRequest,
    TripStatus,
    type TripsServiceClient,
    VehicleType as TripVehicleType,
    type ListTripsByVehicleTypeRequest,
    type ListTripsRequest,
    type ListTripsByDriverRequest,
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
                    vehiclePlate: trip.vehiclePlate || '',
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

        console.log('routes', routes);

        if (Number(totalRoutes) === 0 || Number(totalTrips) === 0) {
            return { routes: [] };
        }

        // Mapear cada ruta con sus viajes a RouteDetailSummary
        const routeDetails: RouteDetailSummary[] = routes.map(
            (routeWithTrips) => {
                const route = routeWithTrips.route;
                const trips = routeWithTrips.trips || [];

                console.log('trips', trips);

                // Sumar consumos de todos los viajes de esta ruta
                let totalEstimated = 0;
                let totalActual = 0;

                for (const trip of trips) {
                    totalEstimated += trip.fuelEstimated || 0;
                    totalActual += trip.fuelActual || 0;
                }

                const difference = totalActual - totalEstimated;

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
                    trips: trips.map((trip) => {
                        // Convertir timestamps a string
                        const formatTimestamp = (
                            ts?: string | { seconds: number; nanos: number },
                        ): string => {
                            if (!ts) return '';
                            if (typeof ts === 'string') return ts;
                            const date = new Date(
                                Number(ts.seconds) * 1000 +
                                    Number(ts.nanos || 0) / 1e6,
                            );
                            return date.toISOString();
                        };

                        return {
                            id: trip.id,
                            startTime: formatTimestamp(trip.startTime),
                            endTime: formatTimestamp(trip.endTime),
                            driverFirstName: trip.driverFirstName || '',
                            driverLastName: trip.driverLastName || '',
                            fuelEstimated: trip.fuelEstimated,
                            fuelActual: trip.fuelActual,
                            difference: trip.fuelActual
                                ? trip.fuelActual - trip.fuelEstimated
                                : 0,
                        };
                    }),
                };
            },
        );

        // Ordenar por routeId
        routeDetails.sort((a, b) => a.routeId - b.routeId);

        return { routes: routeDetails };
    }

    public async generateKPIs(
        data: GenerateKPIsRequest,
        metadata?: Metadata,
    ): Promise<GenerateKPIsResponse> {
        const tripsClient = await this.tripsClient();

        // Convertir statusFilter de string a TripStatus enum si se proporciona
        let statusFilter: TripStatus | undefined;
        if (data.statusFilter) {
            const normalized = data.statusFilter.toUpperCase();
            switch (normalized) {
                case 'CREADO':
                    statusFilter = TripStatus.CREADO;
                    break;
                case 'EN_RUTA':
                    statusFilter = TripStatus.EN_RUTA;
                    break;
                case 'EN_REVISION':
                    statusFilter = TripStatus.EN_REVISION;
                    break;
                case 'TERMINADO':
                    statusFilter = TripStatus.TERMINADO;
                    break;
            }
        }

        const request: ListTripsRequest = {
            statusFilter,
        };

        const { trips: segmentedTrips, totalTrips } = await safeGrpcCall(
            tripsClient.ListTrips(request, metadata),
            'FuelService.ListTrips',
        );

        // Combinar todos los viajes de todos los estados
        const allTrips: Array<{
            fuelEstimated: number;
            fuelActual?: number;
        }> = [];

        if (segmentedTrips.CREADO) {
            allTrips.push(...segmentedTrips.CREADO);
        }
        if (segmentedTrips.EN_RUTA) {
            allTrips.push(...segmentedTrips.EN_RUTA);
        }
        if (segmentedTrips.EN_REVISION) {
            allTrips.push(...segmentedTrips.EN_REVISION);
        }
        if (segmentedTrips.TERMINADO) {
            allTrips.push(...segmentedTrips.TERMINADO);
        }

        const totalTripsCount = Number(totalTrips) || allTrips.length;

        // Calcular eficiencia promedio
        // Eficiencia = (estimated / actual) * 100 para cada viaje
        // Promedio = suma de eficiencias / número de viajes con fuelActual
        let totalEfficiency = 0;
        let tripsWithActualFuel = 0;

        for (const trip of allTrips) {
            if (trip.fuelActual && trip.fuelActual > 0 && trip.fuelEstimated) {
                const efficiency = (trip.fuelEstimated / trip.fuelActual) * 100;
                totalEfficiency += efficiency;
                tripsWithActualFuel++;
            }
        }

        const averageEfficiency =
            tripsWithActualFuel > 0 ? totalEfficiency / tripsWithActualFuel : 0;

        return {
            totalTrips: totalTripsCount,
            averageEfficiency: averageEfficiency,
        };
    }

    public async generateDriverRankingReport(
        data: GenerateDriverRankingReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateDriverRankingReportResponse> {
        const tripsClient = await this.tripsClient();

        // Convertir statusFilter de string a TripStatus enum si se proporciona
        let statusFilter: TripStatus | undefined;
        if (data.statusFilter) {
            const normalized = data.statusFilter.toUpperCase();
            switch (normalized) {
                case 'CREADO':
                    statusFilter = TripStatus.CREADO;
                    break;
                case 'EN_RUTA':
                    statusFilter = TripStatus.EN_RUTA;
                    break;
                case 'EN_REVISION':
                    statusFilter = TripStatus.EN_REVISION;
                    break;
                case 'TERMINADO':
                    statusFilter = TripStatus.TERMINADO;
                    break;
            }
        }

        const request: ListTripsRequest = {
            statusFilter,
        };

        const { trips: segmentedTrips } = await safeGrpcCall(
            tripsClient.ListTrips(request, metadata),
            'FuelService.ListTrips',
        );

        // Combinar todos los viajes de todos los estados
        const allTrips: Array<{
            driverId: number;
            driverFirstName?: string;
            driverLastName?: string;
            status: TripStatus;
        }> = [];

        if (segmentedTrips.CREADO) {
            allTrips.push(...segmentedTrips.CREADO);
        }
        if (segmentedTrips.EN_RUTA) {
            allTrips.push(...segmentedTrips.EN_RUTA);
        }
        if (segmentedTrips.EN_REVISION) {
            allTrips.push(...segmentedTrips.EN_REVISION);
        }
        if (segmentedTrips.TERMINADO) {
            allTrips.push(...segmentedTrips.TERMINADO);
        }

        if (allTrips.length === 0) {
            return { drivers: [] };
        }

        // Agrupar viajes por driverId y contar
        const driverMap = new Map<number, DriverRankingSummary>();

        for (const trip of allTrips) {
            const driverId = Number(trip.driverId);

            if (!driverMap.has(driverId)) {
                driverMap.set(driverId, {
                    driverId,
                    driverFirstName: trip.driverFirstName || '',
                    driverLastName: trip.driverLastName || '',
                    totalTrips: 0,
                    tripsCreados: 0,
                    tripsEnRuta: 0,
                    tripsEnRevision: 0,
                    tripsTerminados: 0,
                });
            }

            const summary = driverMap.get(driverId)!;
            summary.totalTrips += 1;

            // Contar viajes por estado
            if (trip.status === TripStatus.CREADO) {
                summary.tripsCreados += 1;
            } else if (trip.status === TripStatus.EN_RUTA) {
                summary.tripsEnRuta += 1;
            } else if (trip.status === TripStatus.EN_REVISION) {
                summary.tripsEnRevision += 1;
            } else if (trip.status === TripStatus.TERMINADO) {
                summary.tripsTerminados += 1;
            }
        }

        // Convertir el Map a array y ordenar por totalTrips descendente
        const driverSummaries: DriverRankingSummary[] = Array.from(
            driverMap.values(),
        ).sort((a, b) => b.totalTrips - a.totalTrips);

        return { drivers: driverSummaries };
    }

    public async getDriverTrips(
        data: GetDriverTripsRequest,
        metadata?: Metadata,
    ): Promise<GetDriverTripsResponse> {
        const tripsClient = await this.tripsClient();

        // Obtener viajes del chofer con estados EN_RUTA y TERMINADO
        // El nuevo método trae toda la información enriquecida directamente
        const request: ListTripsByDriverRequest = {
            driverId: Number(data.driverId),
            statusFilter: [TripStatus.EN_RUTA, TripStatus.TERMINADO],
        };

        const { trips } = await safeGrpcCall(
            tripsClient.ListTripsByDriver(request, metadata),
            'FuelService.ListTripsByDriver',
        );

        if (trips.length === 0) {
            return { trips: [] };
        }

        // Construir la respuesta con todos los detalles
        // El mapper de routes-srv usa snake_case (origin_name, destination_name)
        const tripDetails: DriverTripDetail[] = trips.map((trip: any) => {
            // Manejar tanto camelCase como snake_case
            // El mapper de routes-srv devuelve origin_name y destination_name (snake_case)
            const startTime = trip.startTime ?? trip.start_time ?? '';
            const endTime = trip.endTime ?? trip.end_time ?? '';
            const vehiclePlate = trip.vehiclePlate ?? trip.vehicle_plate ?? '';
            const fuelEstimated =
                trip.fuelEstimated ?? trip.fuel_estimated ?? 0;
            const fuelActual = trip.fuelActual ?? trip.fuel_actual ?? 0;
            // El mapper usa origin_name y destination_name (snake_case)
            const originName = trip.originName ?? trip.origin_name ?? '';
            const destinationName =
                trip.destinationName ?? trip.destination_name ?? '';
            const originLat = trip.originLat ?? trip.origin_lat ?? 0;
            const originLng = trip.originLng ?? trip.origin_lng ?? 0;
            const destinationLat =
                trip.destinationLat ?? trip.destination_lat ?? 0;
            const destinationLng =
                trip.destinationLng ?? trip.destination_lng ?? 0;
            const status = trip.status;

            // Formatear fecha de inicio
            const startTimeFormatted =
                this.formatTimestampToDDMMHHMM(startTime);

            // Formatear fecha de fin (vacío si no existe)
            const endTimeFormatted = endTime
                ? this.formatTimestampToDDMMHHMM(endTime)
                : '';

            // Estado como string
            let statusString = '';
            if (status === TripStatus.EN_RUTA || status === 2) {
                statusString = 'EN_RUTA';
            } else if (status === TripStatus.TERMINADO || status === 4) {
                statusString = 'TERMINADO';
            }

            return {
                tripId: trip.id || Number(trip.id),
                vehicle: vehiclePlate,
                status: statusString,
                startTime: startTimeFormatted,
                endTime: endTimeFormatted,
                fuelEstimated: fuelEstimated,
                fuelActual: fuelActual,
                originName: originName,
                destinationName: destinationName,
                originLat: originLat,
                originLng: originLng,
                destinationLat: destinationLat,
                destinationLng: destinationLng,
            };
        });

        // Ordenar por fecha de inicio descendente (más recientes primero)
        tripDetails.sort((a, b) => {
            return b.startTime.localeCompare(a.startTime);
        });

        return { trips: tripDetails };
    }

    public async generateRoutesSummaryReport(
        data: GenerateRoutesSummaryReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateRoutesSummaryReportResponse> {
        const routesClient = await this.routesClient();
        const tripsClient = await this.tripsClient();

        // Obtener todas las rutas
        const routesRequest: ListRoutesRequest = {};
        const { routes } = await safeGrpcCall(
            routesClient.ListRoutes(routesRequest, metadata),
            'FuelService.ListRoutes',
        );

        // Obtener todos los viajes (sin filtros)
        const tripsRequest: ListTripsRequest = {};
        const tripsResponse = await safeGrpcCall(
            tripsClient.ListTrips(tripsRequest, metadata),
            'FuelService.ListTrips',
        );

        // Consolidar todos los viajes en un solo array
        const allTrips: any[] = [];
        if (tripsResponse.trips.CREADO) {
            allTrips.push(...tripsResponse.trips.CREADO);
        }
        if (tripsResponse.trips.EN_RUTA) {
            allTrips.push(...tripsResponse.trips.EN_RUTA);
        }
        if (tripsResponse.trips.EN_REVISION) {
            allTrips.push(...tripsResponse.trips.EN_REVISION);
        }
        if (tripsResponse.trips.TERMINADO) {
            allTrips.push(...tripsResponse.trips.TERMINADO);
        }

        // Agrupar viajes por routeId
        const tripsByRouteId = new Map<number, any[]>();
        for (const trip of allTrips) {
            const routeId = Number(trip.routeId ?? trip.route_id ?? 0);
            if (routeId > 0) {
                if (!tripsByRouteId.has(routeId)) {
                    tripsByRouteId.set(routeId, []);
                }
                tripsByRouteId.get(routeId)!.push(trip);
            }
        }

        // Calcular métricas para cada ruta
        const routeSummaries: RouteSummary[] = routes.map((route: any) => {
            const routeId = Number(route.id ?? route.route_id ?? 0);
            const trips = tripsByRouteId.get(routeId) || [];

            // Calcular totales
            let totalEstimated = 0;
            let totalActual = 0;

            for (const trip of trips) {
                const estimated =
                    trip.fuelEstimated ?? trip.fuel_estimated ?? 0;
                const actual = trip.fuelActual ?? trip.fuel_actual ?? 0;

                totalEstimated += estimated;
                totalActual += actual;
            }

            // Calcular diferencia y eficiencia
            const difference = totalActual - totalEstimated;
            const efficiency =
                totalActual > 0
                    ? (totalEstimated / totalActual) * 100
                    : totalEstimated > 0
                      ? 100
                      : 0;

            // Formatear nombre de ruta: "Origen → Destino"
            const originName =
                route.originName ?? route.origin_name ?? 'Origen';
            const destinationName =
                route.destinationName ?? route.destination_name ?? 'Destino';
            const routeName = `${originName} → ${destinationName}`;

            return {
                routeId: routeId,
                routeName: routeName,
                totalTrips: trips.length,
                estimated: Number(totalEstimated.toFixed(2)),
                actual: Number(totalActual.toFixed(2)),
                difference: Number(difference.toFixed(2)),
                efficiency: Number(efficiency.toFixed(2)),
            };
        });

        // Filtrar solo rutas que tienen viajes
        const routesWithTrips = routeSummaries.filter(
            (summary) => summary.totalTrips > 0,
        );

        // Ordenar por total de viajes descendente
        routesWithTrips.sort((a, b) => b.totalTrips - a.totalTrips);

        return { routes: routesWithTrips };
    }

    public async getRouteTripsDetail(
        data: GetRouteTripsDetailRequest,
        metadata?: Metadata,
    ): Promise<GetRouteTripsDetailResponse> {
        const tripsClient = await this.tripsClient();
        const routesClient = await this.routesClient();

        // Obtener la información de la ruta
        const routeResponse = await safeGrpcCall(
            routesClient.GetRoute({ id: Number(data.routeId) }, metadata),
            'FuelService.GetRoute',
        );

        const route = routeResponse.route;
        if (!route) {
            return { trips: [] };
        }

        // Extraer información de origen y destino de la ruta
        const originName = route.originName ?? '';
        const destinationName = route.destinationName ?? '';
        const originLat = route.originLat ?? 0;
        const originLng = route.originLng ?? 0;
        const destinationLat = route.destinationLat ?? 0;
        const destinationLng = route.destinationLng ?? 0;

        // Obtener todos los viajes (sin filtros)
        const tripsRequest: ListTripsRequest = {};
        const tripsResponse = await safeGrpcCall(
            tripsClient.ListTrips(tripsRequest, metadata),
            'FuelService.ListTrips',
        );

        // Consolidar todos los viajes en un solo array
        const allTrips: any[] = [];
        if (tripsResponse.trips.CREADO) {
            allTrips.push(...tripsResponse.trips.CREADO);
        }
        if (tripsResponse.trips.EN_RUTA) {
            allTrips.push(...tripsResponse.trips.EN_RUTA);
        }
        if (tripsResponse.trips.EN_REVISION) {
            allTrips.push(...tripsResponse.trips.EN_REVISION);
        }
        if (tripsResponse.trips.TERMINADO) {
            allTrips.push(...tripsResponse.trips.TERMINADO);
        }

        // Filtrar viajes por routeId
        const routeTrips = allTrips.filter((trip) => {
            const tripRouteId = Number(trip.routeId ?? trip.route_id ?? 0);
            return tripRouteId === Number(data.routeId);
        });

        if (routeTrips.length === 0) {
            return { trips: [] };
        }

        // Mapear a RouteTripDetail
        const tripDetails: RouteTripDetail[] = routeTrips.map((trip: any) => {
            // Manejar tanto camelCase como snake_case
            const startTime = trip.startTime ?? trip.start_time ?? '';
            const endTime = trip.endTime ?? trip.end_time ?? '';
            const vehiclePlate = trip.vehiclePlate ?? trip.vehicle_plate ?? '';
            const driverFirstName =
                trip.driverFirstName ?? trip.driver_first_name ?? '';
            const driverLastName =
                trip.driverLastName ?? trip.driver_last_name ?? '';
            const fuelEstimated =
                trip.fuelEstimated ?? trip.fuel_estimated ?? 0;
            const fuelActual = trip.fuelActual ?? trip.fuel_actual ?? 0;
            const status = trip.status;

            // Formatear fecha de inicio
            const startTimeFormatted =
                this.formatTimestampToDDMMHHMM(startTime);

            // Formatear fecha de fin (vacío si no existe)
            const endTimeFormatted = endTime
                ? this.formatTimestampToDDMMHHMM(endTime)
                : '';

            // Estado como string
            let statusString = '';
            if (status === TripStatus.CREADO || status === 1) {
                statusString = 'CREADO';
            } else if (status === TripStatus.EN_RUTA || status === 2) {
                statusString = 'EN_RUTA';
            } else if (status === TripStatus.EN_REVISION || status === 3) {
                statusString = 'EN_REVISION';
            } else if (status === TripStatus.TERMINADO || status === 4) {
                statusString = 'TERMINADO';
            }

            // Calcular diferencia
            const difference = fuelActual - fuelEstimated;

            // Calcular eficiencia: (estimado / real) * 100
            const efficiency =
                fuelActual > 0
                    ? (fuelEstimated / fuelActual) * 100
                    : fuelEstimated > 0
                      ? 100
                      : 0;

            return {
                tripId: trip.id || Number(trip.id),
                driverFirstName: driverFirstName,
                driverLastName: driverLastName,
                vehicle: vehiclePlate,
                status: statusString,
                startTime: startTimeFormatted,
                endTime: endTimeFormatted,
                estimated: Number(fuelEstimated.toFixed(2)),
                actual: Number(fuelActual.toFixed(2)),
                difference: Number(difference.toFixed(2)),
                efficiency: Number(efficiency.toFixed(1)),
                originName: originName,
                destinationName: destinationName,
                originLat: originLat,
                originLng: originLng,
                destinationLat: destinationLat,
                destinationLng: destinationLng,
            };
        });

        // Ordenar por fecha de inicio descendente (más recientes primero)
        tripDetails.sort((a, b) => {
            return b.startTime.localeCompare(a.startTime);
        });

        return { trips: tripDetails };
    }

    public async generateMachineryTypeReport(
        data: GenerateMachineryTypeReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateMachineryTypeReportResponse> {
        const tripsClient = await this.tripsClient();

        const startTimeStr = this.formatDateToYYYYMMDD(data.startDate);
        const endTimeStr = this.formatDateToYYYYMMDD(data.endDate);

        const request: ListTripsByTimeRangeRequest = {
            startTime: startTimeStr,
            endTime: endTimeStr,
        };

        // Formatear período en ISO 8601: "2025-10-01 – 2025-10-31"
        const startDateISO = this.formatDateToYYYYMMDD(data.startDate);
        const endDateISO = this.formatDateToYYYYMMDD(data.endDate);
        const period = `${startDateISO} – ${endDateISO}`;

        // Formatear fecha de generación en ISO 8601
        const generatedAt = new Date().toISOString();

        // Obtener todos los viajes en el rango de fechas
        const { trips: allTripsInRange, totalTrips } = await safeGrpcCall(
            tripsClient.ListTripsByTimeRange(request, metadata),
            'FuelService.ListTripsByTimeRange',
        );

        if (Number(totalTrips) === 0) {
            return {
                period,
                generatedAt,
                totalTrips: 0,
                totalEstimated: 0,
                totalActual: 0,
                globalEfficiency: 0,
                machineryTypes: [],
            };
        }

        // Filtrar solo los viajes TERMINADOS
        const filteredTrips = allTripsInRange.filter(
            (trip) => trip.status === TripStatus.TERMINADO,
        );

        if (filteredTrips.length === 0) {
            return {
                period,
                generatedAt,
                totalTrips: 0,
                totalEstimated: 0,
                totalActual: 0,
                globalEfficiency: 0,
                machineryTypes: [],
            };
        }

        const routesClient = await this.routesClient();

        // Consultar todas las rutas en paralelo
        const routeResponses = await Promise.all(
            filteredTrips.map((trip) =>
                safeGrpcCall(
                    routesClient.GetRoute({ id: trip.routeId }, metadata),
                    'FuelService.GetRoute',
                ),
            ),
        );

        // Acumulador de combustible por tipo
        const fuelTotals = {
            [VehicleType.LIVIANO]: {
                trips: 0,
                estimated: 0,
                actual: 0,
            },
            [VehicleType.PESADO]: {
                trips: 0,
                estimated: 0,
                actual: 0,
            },
            [VehicleType.CUALQUIERA]: {
                trips: 0,
                estimated: 0,
                actual: 0,
            },
        };

        // Procesar viajes y agrupar por tipo
        for (let i = 0; i < filteredTrips.length; i++) {
            const trip = filteredTrips[i];
            const route = routeResponses[i].route;
            const type = route.vehicleType ?? VehicleType.CUALQUIERA;

            fuelTotals[type].trips += 1;
            fuelTotals[type].estimated += trip.fuelEstimated || 0;
            fuelTotals[type].actual += trip.fuelActual || 0;
        }

        // Calcular totales globales
        const totalEstimated =
            fuelTotals[VehicleType.LIVIANO].estimated +
            fuelTotals[VehicleType.PESADO].estimated +
            fuelTotals[VehicleType.CUALQUIERA].estimated;

        const totalActual =
            fuelTotals[VehicleType.LIVIANO].actual +
            fuelTotals[VehicleType.PESADO].actual +
            fuelTotals[VehicleType.CUALQUIERA].actual;

        // Calcular eficiencia global: (estimado / real) * 100
        const globalEfficiency =
            totalActual > 0 ? (totalEstimated / totalActual) * 100 : 0;

        // Construir resumen por tipo
        const machineryTypes: MachineryTypeSummary[] = [];

        // Liviana
        const lightDifference =
            fuelTotals[VehicleType.LIVIANO].actual -
            fuelTotals[VehicleType.LIVIANO].estimated;
        const lightEfficiency =
            fuelTotals[VehicleType.LIVIANO].actual > 0
                ? (fuelTotals[VehicleType.LIVIANO].estimated /
                      fuelTotals[VehicleType.LIVIANO].actual) *
                  100
                : 0;

        machineryTypes.push({
            type: VehicleType.LIVIANO,
            trips: fuelTotals[VehicleType.LIVIANO].trips,
            estimated: Number(
                fuelTotals[VehicleType.LIVIANO].estimated.toFixed(2),
            ),
            actual: Number(fuelTotals[VehicleType.LIVIANO].actual.toFixed(2)),
            difference: Number(lightDifference.toFixed(2)),
            efficiency: Number(lightEfficiency.toFixed(1)),
        });

        // Pesada
        const heavyDifference =
            fuelTotals[VehicleType.PESADO].actual -
            fuelTotals[VehicleType.PESADO].estimated;
        const heavyEfficiency =
            fuelTotals[VehicleType.PESADO].actual > 0
                ? (fuelTotals[VehicleType.PESADO].estimated /
                      fuelTotals[VehicleType.PESADO].actual) *
                  100
                : 0;

        machineryTypes.push({
            type: VehicleType.PESADO,
            trips: fuelTotals[VehicleType.PESADO].trips,
            estimated: Number(
                fuelTotals[VehicleType.PESADO].estimated.toFixed(2),
            ),
            actual: Number(fuelTotals[VehicleType.PESADO].actual.toFixed(2)),
            difference: Number(heavyDifference.toFixed(2)),
            efficiency: Number(heavyEfficiency.toFixed(1)),
        });

        // Cualquiera
        const anyDifference =
            fuelTotals[VehicleType.CUALQUIERA].actual -
            fuelTotals[VehicleType.CUALQUIERA].estimated;
        const anyEfficiency =
            fuelTotals[VehicleType.CUALQUIERA].actual > 0
                ? (fuelTotals[VehicleType.CUALQUIERA].estimated /
                      fuelTotals[VehicleType.CUALQUIERA].actual) *
                  100
                : 0;

        machineryTypes.push({
            type: VehicleType.CUALQUIERA,
            trips: fuelTotals[VehicleType.CUALQUIERA].trips,
            estimated: Number(
                fuelTotals[VehicleType.CUALQUIERA].estimated.toFixed(2),
            ),
            actual: Number(
                fuelTotals[VehicleType.CUALQUIERA].actual.toFixed(2),
            ),
            difference: Number(anyDifference.toFixed(2)),
            efficiency: Number(anyEfficiency.toFixed(1)),
        });

        return {
            period,
            generatedAt,
            totalTrips: filteredTrips.length,
            totalEstimated: Number(totalEstimated.toFixed(2)),
            totalActual: Number(totalActual.toFixed(2)),
            globalEfficiency: Number(globalEfficiency.toFixed(1)),
            machineryTypes,
        };
    }

    /**
     * Convierte un timestamp a formato DD/MM HH:mm
     */
    private formatTimestampToDDMMHHMM(
        timestamp?: string | { seconds: number; nanos: number },
    ): string {
        if (!timestamp) return '';

        let date: Date;
        if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            date = new Date(
                Number(timestamp.seconds) * 1000 +
                    Number(timestamp.nanos || 0) / 1e6,
            );
        }

        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');

        return `${day}/${month} ${hours}:${minutes}`;
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
