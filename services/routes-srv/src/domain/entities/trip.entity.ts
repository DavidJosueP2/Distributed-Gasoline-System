// src/domain/entities/trip.entity.ts
import { TripStatus } from '../value-objects/trip-status.vo';

export interface Trip {
  id: bigint;
  routeId: bigint;
  supervisorId: bigint;
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
  createdAt: Date;
  updatedAt: Date;
}
