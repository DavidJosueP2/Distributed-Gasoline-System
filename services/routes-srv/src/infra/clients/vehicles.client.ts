// src/infra/clients/vehicles.client.ts
import { Observable } from 'rxjs';

export interface VehiclesServiceClient {
  getUnitConsumptionProfile(req: GetUnitConsumptionProfileRequest): Observable<GetUnitConsumptionProfileResponse>;
}

export interface GetUnitConsumptionProfileRequest {
  vehicleId: bigint;
}

export interface GetUnitConsumptionProfileResponse {
  vehicleId: bigint;
  baselineModelLPer100km: number;
  calibrationK: number;
  effectiveLPer100km: number;  // ← ESTO ES LO QUE NECESITAMOS
  baselineOverrideLPer100km: number;
  engineType?: string;
  vehicleYear: number;
  odometerKm: number;
}
