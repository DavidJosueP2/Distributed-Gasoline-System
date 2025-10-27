import { Observable } from 'rxjs';

export type LongObject = {
    low: number;
    high: number;
    unsigned?: boolean;
    toNumber?: () => number;
};

type LongLike = string | number | LongObject;

export interface RouteResponse {
    id: LongLike;
    name: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: number; // 1 = LIVIANO, 2 = PESADO
}

export interface RouteList {
    routes: RouteResponse[];
}

export interface CreateRouteRequest {
    name: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: number; // 1 = LIVIANO, 2 = PESADO
}

export interface UpdateRouteRequest {
    id: LongLike;
    name: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: number; // 1 = LIVIANO, 2 = PESADO
}

export interface GetRouteRequest {
    id: LongLike;
}

export interface DeleteRouteRequest {
    id: LongLike;
}

export interface ListRoutesRequest {
    vehicleTypeFilter?: number; // 1 = LIVIANO, 2 = PESADO
}

export interface AssignVehicleToRouteRequest {
    routeId: LongLike;
    vehicleId: LongLike;
}

export interface RoutesServiceClient {
    CreateRoute(data: CreateRouteRequest, metadata?: any): Observable<{ id: string }>;
    GetRoute(data: GetRouteRequest, metadata?: any): Observable<{ route: RouteResponse }>;
    ListRoutes(data: ListRoutesRequest, metadata?: any): Observable<RouteList>;
    UpdateRoute(data: UpdateRouteRequest, metadata?: any): Observable<RouteResponse>;
    DeleteRoute(data: DeleteRouteRequest, metadata?: any): Observable<{}>;
    AssignVehicleToRoute(data: AssignVehicleToRouteRequest, metadata?: any): Observable<{ success: boolean; message: string }>;
}
