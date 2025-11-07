// src/domain/entities/trip.entity.ts
import { TripStatus } from '../value-objects/trip-status.vo';

export interface Trip {
  id: bigint;
  routeId: bigint;
  supervisorId: bigint; // Supervisor asignado desde el inicio
  driverId: bigint;
  vehicleId: bigint;
  startTime?: Date | null;
  endTime?: Date | null;
  status: TripStatus;
  odometerStart: number;
  odometerEnd?: number | null;
  distanceKmReal?: number | null;
  distanceKmPlanned: number;
  fuelEstimated: number;
  fuelActual?: number | null;
  reviewComment?: string | null;
  // Campos de ubicación actual durante el viaje
  currentLat?: number | null; // Latitud actual del conductor
  currentLng?: number | null; // Longitud actual del conductor
  currentDistance?: number | null; // Distancia actual recorrida (km)
  createdAt: Date;
  updatedAt: Date;
  // Campos opcionales de la ruta (se cargan cuando se hace JOIN)
  routeOriginName?: string;
  routeDestinationName?: string;
  routeOriginLat?: number;
  routeOriginLng?: number;
  routeDestinationLat?: number;
  routeDestinationLng?: number;
}
