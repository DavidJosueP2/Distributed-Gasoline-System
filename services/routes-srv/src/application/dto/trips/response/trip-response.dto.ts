export interface TripResponseDto {
  id: number;
  routeId: number;
  supervisorId: number;
  driverId: number;
  vehicleId: number;
  startTime?: Date | null;
  endTime?: Date | null;
  status: string;
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
