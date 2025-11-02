import { Observable } from 'rxjs';

// RoutesService
export interface RoutesServiceClient {
    GetRoute(
        data: GetRouteRequest,
        metadata?: any,
    ): Observable<GetRouteResponse>;
}

export interface GetRouteRequest {
    id: number;
}

export interface GetRouteResponse {
    route: Route;
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
