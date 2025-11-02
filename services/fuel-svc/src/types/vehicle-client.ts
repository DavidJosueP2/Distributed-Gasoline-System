import { Observable } from 'rxjs';

// =====================
// Enums
// =====================

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

// =====================
// Common Types
// =====================

export interface LicenseRef {
    licenseTypeCode?: string;
    licenseTypeId?: number;
}

export interface VehicleUnitConsumption {
    baselineModelLPer_100km: number;
    calibrationK: number;
    effectiveLPer_100km: number;
    baselineOverrideLPer_100km: number;
}

export interface VehicleUnit {
    vehicleId: number;
    modelId: number;
    plate: string;
    serialVin: string;
    operationalStatus: OperationalStatus;
    tankCapacityL: number;
    odometerKm: number;
    createdAt?: string | { seconds: number; nanos: number };
    updatedAt?: string | { seconds: number; nanos: number };
    consumption?: VehicleUnitConsumption;
}

export interface VehicleModel {
    modelId: number;
    brand: string;
    family: string;
    trim: string;
    yearFrom: number;
    yearTo?: number;
    machineType: MachineType;
    status: string;
    createdAt?: string | { seconds: number; nanos: number };
    updatedAt?: string | { seconds: number; nanos: number };
}

// =====================
// Request/Response Types
// =====================

export interface GetUnitRequest {
    vehicleId?: number;
    plate?: string;
    serialVin?: string;
}

export interface GetUnitResponse {
    unit: VehicleUnit;
    requiredLicenses: LicenseRef[];
}

export interface GetModelRequest {
    modelId: number;
}

export interface ModelEngineSpec {
    modelId: number;
    engineType: EngineType;
    displacementCc: number;
    powerHp: number;
    baselineLPer_100km: number;
}

export interface GetModelResponse {
    model: VehicleModel;
    engine: ModelEngineSpec;
    defaultLicenses: LicenseRef[];
}

// =====================
// Service Client Interface
// =====================

export interface VehiclesServiceClient {
    GetUnit(data: GetUnitRequest, metadata?: any): Observable<GetUnitResponse>;

    GetModel(
        data: GetModelRequest,
        metadata?: any,
    ): Observable<GetModelResponse>;
}
