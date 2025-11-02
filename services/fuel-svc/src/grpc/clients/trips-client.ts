import { Observable } from 'rxjs';

// Assumed client for TripsService until proto exists
// Based on trips table structure
export interface Trip {
    id: number;
    routeId: number;
    supervisorId: number;
    driverId: number;
    vehicleId: number;
    startTime?: string;
    endTime?: string;
    status: 'CREADO' | 'EN_RUTA' | 'EN_REVISION' | 'TERMINADO';
    odometerStart: number;
    odometerEnd?: number;
    distanceKmReal?: number;
    distanceKmPlanned: number;
    fuelEstimated: number;
    fuelActual?: number;
    reviewComment?: string;
    currentLat?: number;
    currentLng?: number;
    currentDistance?: number;
    createdAt: string;
    updatedAt: string;
}

export interface GetTripByIdRequest {
    tripId: number | string;
}

export interface GetTripsByDateRangeRequest {
    startDate: string;
    endDate: string;
}

export interface TripsList {
    trips: Trip[];
    total: number;
}

export interface TripsServiceClient {
    GetTripById(data: GetTripByIdRequest, metadata?: any): Observable<Trip>;

    GetTripsByDateRange(
        data: GetTripsByDateRangeRequest,
        metadata?: any,
    ): Observable<TripsList>;
}
