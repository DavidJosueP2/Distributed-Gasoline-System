import { Observable } from 'rxjs';

export enum MachineType {
  MACHINE_TYPE_UNSPECIFIED = 0,
  LIGHT = 1,
  HEAVY = 2,
}

export enum EngineType {
  ENGINE_TYPE_UNSPECIFIED = 0,
  GASOLINE = 1,
  DIESEL = 2,
  HYBRID = 3,
}

export enum OperationalStatus {
  OPERATIONAL_STATUS_UNSPECIFIED = 0,
  ACTIVE = 1,
  MAINTENANCE = 2,
  RETIRED = 3,
  ON_ROUTE = 4,
}

export interface VehicleModel {
  model_id: number | string;
  brand: string;
  family: string;
  trim: string;
  year_from: number;
  year_to: number;
  machine_type: MachineType;
  status: string;
  created_at: { seconds: number | string; nanos: number };
  updated_at: { seconds: number | string; nanos: number };
}

export interface VehicleUnitConsumption {
  unit_id: number | string;
  l_per_100km: number;
  updated_at?: { seconds: number | string; nanos: number };
}

export interface VehicleUnit {
  unit_id: number | string;
  model_id: number | string;
  vin?: string;
  plate?: string;
  status: OperationalStatus | string;
  created_at: { seconds: number | string; nanos: number };
  updated_at: { seconds: number | string; nanos: number };
}

export interface GetUnitRequest {
  unitId: number | string;
}

export interface GetUnitResponse {
  unit?: VehicleUnit;
  model?: VehicleModel;
  consumption?: VehicleUnitConsumption;
}

export interface GetUnitConsumptionProfileRequest {
  unitId: number | string;
}

export interface GetUnitConsumptionProfileResponse {
  unitId: number | string;
  baselineLPer_100km: number;
  lastMeasuredLPer_100km?: number;
}

export interface UpsertUnitConsumptionRequest {
  unitId: number | string;
  lPer_100km: number;
  measuredAt?: { seconds: number | string; nanos: number };
}

export interface EstimateFuelRequest {
  unitId: number | string;
  distanceKm: number;
}

export interface EstimateFuelResponse {
  litersEstimated: number;
}

export interface VehiclesServiceClient {
  GetUnit(
    data: GetUnitRequest,
    metadata?: any,
  ): Observable<GetUnitResponse>;

  GetUnitConsumptionProfile(
    data: GetUnitConsumptionProfileRequest,
    metadata?: any,
  ): Observable<GetUnitConsumptionProfileResponse>;

  UpsertUnitConsumption(
    data: UpsertUnitConsumptionRequest,
    metadata?: any,
  ): Observable<VehicleUnitConsumption>;

  EstimateFuelSimple(
    data: EstimateFuelRequest,
    metadata?: any,
  ): Observable<EstimateFuelResponse>;
}


