import { Observable } from 'rxjs';

// TripsService
export interface TripsServiceClient {
    ListTrips(
        data: ListTripsRequest,
        metadata?: any,
    ): Observable<ListTripsResponse>;
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
    creado?: Trip[];
    enRuta?: Trip[];
    enRevision?: Trip[];
    terminado?: Trip[];
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
