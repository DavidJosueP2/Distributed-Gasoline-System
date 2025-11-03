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
    distanceKmPlanned?: number;
    currentLat?: number;
    currentLng?: number;
    currentDistance?: number;
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
    // Información enriquecida
    routeName?: string;
    originName?: string;
    destinationName?: string;
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    vehiclePlate?: string;
    driverFirstName?: string;
    driverLastName?: string;
    supervisorFirstName?: string;
    supervisorLastName?: string;
    // Mantener compatibilidad
    vehicleInfo?: any;
    driverInfo?: any;
    supervisorInfo?: any;
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
    currentLat?: number;
    currentLng?: number;
}

export interface FinishTripRequest {
    id: LongLike;
    odometerEnd: number;
}

export interface ReviewTripRequest {
    id: LongLike;
    reviewComment: string;
}

export interface GetTripResponse {
    trip: TripResponse;
    routeName?: string;
    originName?: string;
    destinationName?: string;
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    driverInfo?: any;
    supervisorInfo?: any;
    vehicleInfo?: any;
}

export interface TripsServiceClient {
    CreateTrip(data: CreateTripRequest, metadata?: any): Observable<{ id: string; fuelEstimated: number }>;
    GetTrip(data: GetTripRequest, metadata?: any): Observable<GetTripResponse>;
    ListTrips(data: ListTripsRequest, metadata?: any): Observable<TripList>;
    UpdateTrip(data: UpdateTripRequest, metadata?: any): Observable<TripResponse>;
    StartTrip(data: StartTripRequest, metadata?: any): Observable<{ startTime: { seconds: number; nanos: number } }>;
    FinishTrip(data: FinishTripRequest, metadata?: any): Observable<{ distanceKmReal: number; fuelActual: number; endTime: { seconds: number; nanos: number } }>;
    ReviewTrip(data: ReviewTripRequest, metadata?: any): Observable<{ reviewedAt: { seconds: number; nanos: number } }>;
}
