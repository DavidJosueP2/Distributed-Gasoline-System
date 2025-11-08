import { Observable } from 'rxjs';

// RoutesService
export interface RoutesServiceClient {
    GetRoute(
        data: GetRouteRequest,
        metadata?: any,
    ): Observable<GetRouteResponse>;
    ListRoutes(
        data: ListRoutesRequest,
        metadata?: any,
    ): Observable<ListRoutesResponse>;
    GetRoutesByVehicleAndStatus(
        data: GetRoutesByVehicleAndStatusRequest,
        metadata?: any,
    ): Observable<GetRoutesByVehicleAndStatusResponse>;
}

export interface GetRouteRequest {
    id: number;
}

export interface GetRouteResponse {
    route: Route;
}

export interface ListRoutesRequest {
    // Por el momento sin parámetros
}

export interface ListRoutesResponse {
    routes: RouteListItem[];
}

export interface RouteListItem {
    id: number;
    name: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
    hasTrips: boolean;
}

export interface Route {
    id: number;
    name: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
    hasTrips: boolean;
    createdAt?: string | { seconds: number; nanos: number };
    updatedAt?: string | { seconds: number; nanos: number };
}

export enum VehicleType {
    VEHICLE_TYPE_UNSPECIFIED = 0,
    LIVIANO = 1,
    PESADO = 2,
    CUALQUIERA = 3,
}

export interface GetRoutesByVehicleAndStatusRequest {
    vehicleId: number;
    status?: string; // CREADO, EN_RUTA, EN_REVISION, TERMINADO
    vehicleType?: VehicleType; // LIVIANO, PESADO, CUALQUIERA
}

export interface RouteWithTrips {
    route: Route;
    trips: Trip[];
}

export interface GetRoutesByVehicleAndStatusResponse {
    routes: RouteWithTrips[];
    totalRoutes: number;
    totalTrips: number;
}

export interface Trip {
    id: number;
    routeId: number;
    supervisorId: number;
    driverId: number;
    vehicleId: number;
    startTime?: string | { seconds: number; nanos: number };
    endTime?: string | { seconds: number; nanos: number };
    status: number;
    odometerStart: number;
    odometerEnd?: number;
    distanceKmReal?: number;
    distanceKmPlanned: number;
    fuelEstimated: number;
    fuelActual?: number;
    reviewComment?: string;
    createdAt?: string | { seconds: number; nanos: number };
    updatedAt?: string | { seconds: number; nanos: number };
    currentLat?: number;
    currentLng?: number;
    currentDistance?: number;
    driverLastName?: string;
    driverFirstName?: string;
}
