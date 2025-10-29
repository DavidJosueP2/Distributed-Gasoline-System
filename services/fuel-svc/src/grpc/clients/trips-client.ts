import { Observable } from 'rxjs';

// Cliente asumido para TripsService hasta que exista el proto
// Basado en la estructura de la tabla trips
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

export interface TripsServiceClient {
  GetTripById(
    data: GetTripByIdRequest,
    metadata?: any,
  ): Observable<Trip>;
}
