import { Observable } from 'rxjs';

export type LongObject = {
    low: number;
    high: number;
    unsigned?: boolean;
    toNumber?: () => number;
};

type LongLike = string | number | LongObject;

export interface TripResponse {
    id: LongLike;
    routeId: LongLike;
    supervisorId: LongLike;
    driverId: LongLike;
    vehicleId: LongLike;
    odometerStart: number;
    odometerEnd?: number;
    fuelEstimated: number;
    fuelActual?: number;
    distanceKmReal?: number;
    status: number; // 1 = CREADO, 2 = EN_RUTA, 3 = EN_REVISION, 4 = TERMINADO
    startTime?: {
        seconds: number;
        nanos: number;
    };
    endTime?: {
        seconds: number;
        nanos: number;
    };
    reviewedAt?: {
        seconds: number;
        nanos: number;
    };
    reviewComment?: string;
}

export interface TripList {
    trips: TripResponse[];
}

export interface CreateTripRequest {
    routeId: LongLike;
    supervisorId: LongLike;
    driverId: LongLike;
    vehicleId: LongLike;
    odometerStart: number;
}

export interface UpdateTripRequest {
    id: LongLike;
    driverId?: LongLike;
    vehicleId?: LongLike;
}

export interface GetTripRequest {
    id: LongLike;
}

export interface ListTripsRequest {
    statusFilter?: number; // 1 = CREADO, 2 = EN_RUTA, 3 = EN_REVISION, 4 = TERMINADO
    driverIdFilter?: LongLike;
}

export interface StartTripRequest {
    id: LongLike;
}

export interface FinishTripRequest {
    id: LongLike;
    odometerEnd: number;
}

export interface ReviewTripRequest {
    id: LongLike;
    reviewComment: string;
}

export interface TripsServiceClient {
    CreateTrip(data: CreateTripRequest, metadata?: any): Observable<{ id: string; fuelEstimated: number }>;
    GetTrip(data: GetTripRequest, metadata?: any): Observable<{ trip: TripResponse }>;
    ListTrips(data: ListTripsRequest, metadata?: any): Observable<TripList>;
    UpdateTrip(data: UpdateTripRequest, metadata?: any): Observable<TripResponse>;
    StartTrip(data: StartTripRequest, metadata?: any): Observable<{ startTime: { seconds: number; nanos: number } }>;
    FinishTrip(data: FinishTripRequest, metadata?: any): Observable<{ distanceKmReal: number; fuelActual: number; endTime: { seconds: number; nanos: number } }>;
    ReviewTrip(data: ReviewTripRequest, metadata?: any): Observable<{ reviewedAt: { seconds: number; nanos: number } }>;
}
