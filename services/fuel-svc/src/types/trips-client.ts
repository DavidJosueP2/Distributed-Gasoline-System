import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';

// TripsService
export interface TripsServiceClient {
    ListTrips(
        data: ListTripsRequest,
        metadata?: Metadata,
    ): Observable<ListTripsResponse>;
    ListTripsByTimeRange(
        data: ListTripsByTimeRangeRequest,
        metadata?: Metadata,
    ): Observable<ListTripsByTimeRangeResponse>;
    ListTripsByVehicleType(
        data: ListTripsByVehicleTypeRequest,
        metadata?: Metadata,
    ): Observable<ListTripsByVehicleTypeResponse>;
}

export interface ListTripsRequest {
    statusFilter?: TripStatus;
    driverIdFilter?: number;
}

export interface ListTripsResponse {
    trips: SegmentedTrips;
    userRole: string;
    totalTrips: number;
}

export interface SegmentedTrips {
    CREADO?: Trip[];
    EN_RUTA?: Trip[];
    EN_REVISION?: Trip[];
    TERMINADO?: Trip[];
}

export interface Trip {
    id: number;
    routeId: number;
    supervisorId: number;
    driverId: number;
    vehicleId: number;
    startTime?: string | { seconds: number; nanos: number };
    endTime?: string | { seconds: number; nanos: number };
    status: TripStatus;
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
}

export enum TripStatus {
    TRIP_STATUS_UNSPECIFIED = 0,
    CREADO = 1,
    EN_RUTA = 2,
    EN_REVISION = 3,
    TERMINADO = 4,
}

export interface ListTripsByTimeRangeRequest {
    startTime: string; // formato YYYY-MM-DD
    endTime: string;
}

export interface ListTripsByTimeRangeResponse {
    trips: Trip[];
    totalTrips: number;
}

export interface ListTripsByVehicleTypeRequest {
    vehicleTypeFilter?: VehicleType;
}

export interface ListTripsByVehicleTypeResponse {
    trips: SegmentedTripsByVehicleType;
    totalTrips: number;
}

export interface SegmentedTripsByVehicleType {
    LIVIANO?: Trip[];
    PESADO?: Trip[];
    CUALQUIERA?: Trip[];
}

export enum VehicleType {
    VEHICLE_TYPE_UNSPECIFIED = 0,
    LIVIANO = 1,
    PESADO = 2,
    CUALQUIERA = 3,
}
