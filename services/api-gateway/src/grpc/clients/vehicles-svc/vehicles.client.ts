import { Observable } from 'rxjs';

// ===== enums =====
export enum MachineType {
    MACHINE_TYPE_UNSPECIFIED = 0,
    LIGHT = 1,
    HEAVY = 2,
}
export enum EngineType {
    ENGINE_TYPE_UNSPECIFIED = 0,
    GASOLINE = 1,
    DIESEL   = 2,
    HYBRID   = 3,
}
export enum ModelStatus {
    MODEL_STATUS_UNSPECIFIED = 0,
    ACTIVE = 1,
    DEPRECATED = 2,
}
export enum UnitOperationalStatus {
    UNIT_STATUS_UNSPECIFIED = 0,
    ACTIVE = 1,
    MAINTENANCE = 2,
    OUT_OF_SERVICE = 3,
}

// ===== messages =====
export interface Pagination { pageSize?: number; pageToken?: string; }
export interface PaginationResult { nextPageToken?: string; }

export interface VehicleModel {
    modelId: number | string;
    brand: string;
    family: string;
    trim?: string;
    yearFrom: number;
    yearTo?: number;
    machineType: MachineType;
    status: ModelStatus;
    createdAt?: { seconds: number | string; nanos: number };
    updatedAt?: { seconds: number | string; nanos: number };
}

export interface ModelEngineSpec {
    modelId?: number | string;
    engineType: EngineType;
    displacementCc?: number;
    powerHp?: number;
    baselineLPer_100km: number;
}

export interface LicenseRef {
    licenseTypeCode?: string;
    licenseTypeId?: number | string;
}

export interface CreateModelRequest {
    brand: string;
    family: string;
    trim?: string;
    yearFrom: number;
    yearTo?: number;
    machineType: MachineType;
    engine: {
        engineType: EngineType;
        displacementCc?: number;
        powerHp?: number;
        baselineLPer_100km: number;
    };
    defaultLicenses?: LicenseRef[];
    idempotencyKey?: string;
}
export interface CreateModelResponse { modelId: number | string; }

export interface ListModelsRequest {
    page?: Pagination;
    brandFilter?: string;
    familyFilter?: string;
    machineTypeFilter?: MachineType;
    statusFilter?: ModelStatus;
}
export interface ListModelsResponse {
    models: VehicleModel[];
    page: PaginationResult;
}

export interface GetModelRequest { modelId: number | string; }
export interface GetModelResponse {
    model: VehicleModel;
    engine?: ModelEngineSpec;
    defaultLicenses?: LicenseRef[];
}

export interface GetModelByIdentityRequest {
    brand: string;
    family: string;
    trim?: string;
    yearFrom: number;
    yearTo: number;
}

// ---- Model License Requirements ----
export interface ListModelLicenseRequirementsRequest {
  modelId: number | string;
}

export interface ListModelLicenseRequirementsResponse {
  licenses: LicenseRef[];
}

export interface SetModelLicenseRequirementsRequest {
  modelId: number | string;
  licenses: LicenseRef[];
}

export interface SetModelLicenseRequirementsResponse {
  licenses: LicenseRef[];
}

export interface DeleteModelLicenseRequirementRequest {
  modelId: number | string;
  licenseTypeCode?: string;
  licenseTypeId?: number | string;
}

export interface DeleteModelLicenseRequirementResponse {
  remainingLicenses: LicenseRef[];
}

// ---- Units ----
export interface VehicleUnitConsumption {
    baselineModelLPer_100km: number;      // baseline del modelo (siempre presente)
    calibrationK: number;                  // factor aplicado
    effectiveLPer_100km: number;          // (override ?? baseline_model) * calibration_k
    baselineOverrideLPer_100km?: number;  // si existe override explícito
}

export interface VehicleUnit {
    vehicleId: number | string;
    modelId: number | string;
    plate: string;
    serialVin?: string;
    operationalStatus: UnitOperationalStatus;
    tankCapacityL?: number;
    odometerKm?: number;
    createdAt?: { seconds: number | string; nanos: number };
    updatedAt?: { seconds: number | string; nanos: number };
    consumption?: VehicleUnitConsumption;
}

export interface ListUnitsRequest { 
    page?: Pagination;
    statusFilter?: UnitOperationalStatus;
    platePrefix?: string;
    modelIdFilter?: number | string;
    machineTypeFilter?: MachineType;
}
export interface ListUnitsResponse {
    units: VehicleUnit[];
    page?: PaginationResult;
}

export interface CreateUnitRequest {
    modelId: number | string;
    plate: string;
    serialVin?: string;
    tankCapacityL?: number;
    odometerKm?: number;
    extraLicenses?: LicenseRef[];
    idempotencyKey?: string;
    consumption?: {
        baselineOverrideLPer_100km?: number;
    };
}
export interface CreateUnitResponse { vehicleId: number | string; }

export interface UpdateUnitStatusRequest {
    vehicleId?: number | string;
    plate?: string;
    newStatus: UnitOperationalStatus;
}

export interface UpsertUnitConsumptionRequest {
    vehicleId: number | string;
    baselineOverrideLPer_100km?: number;
    calibrationK?: number;
}

export interface UpdateUnitRequest {
    vehicleId: number | string;
    plate?: string;
    tankCapacityL?: number;
    odometerKm?: number;
}

export interface GetUnitRequest {
    vehicleId?: number | string;
    plate?: string;
    serialVin?: string;
}

export interface GetUnitResponse {
    unit: VehicleUnit;
    requiredLicenses?: LicenseRef[];
}

export interface DeleteUnitRequest {
    vehicleId?: number | string;
    plate?: string;
}
export interface DeleteUnitResponse { deletedAt?: { seconds: number | string; nanos: number }; }

// ---- Consumption Profile ----
export interface GetUnitConsumptionProfileRequest {
    vehicleId?: number | string;
    plate?: string;
}

export interface GetUnitConsumptionProfileResponse {
    vehicleId: number | string;
    baselineModelLPer_100km: number;     // baseline del modelo (siempre presente)
    calibrationK: number;                 // factor aplicado
    effectiveLPer_100km: number;         // (override ?? baseline_model) * calibration_k
    baselineOverrideLPer_100km: number;  // si existe override explícito
    engineType: EngineType;               // tipo de motor del modelo
    vehicleYear: number;                  // año del vehículo
    odometerKm: number;                   // kilometraje actual
}

// ---- Update Model ----
export interface UpdateModelRequest {
    modelId: number | string;
    expectedVersion?: number | string; // Optimistic lock
    status?: ModelStatus;
    yearTo?: number;                  // 0 => null
    brand?: string;                   // restricted: only if no units
    family?: string;                  // restricted: only if no units
    trim?: string;                    // '' => null (restricted)
    yearFrom?: number;                // restricted
    machineType?: MachineType;        // LIGHT | HEAVY (restricted)
    engine?: {
        engineType?: EngineType;
        displacementCc?: number;
        powerHp?: number;
        baselineLPer_100km?: number;
    };
}

export interface DeleteModelRequest {
    modelId: number | string;
    expectedVersion?: number | string; // Optimistic lock
}

export interface DeleteModelResponse {}

// ===== service =====
export interface VehiclesServiceClient {
    CreateModel(data: CreateModelRequest, metadata?: any): Observable<CreateModelResponse>;
    ListModels(data: ListModelsRequest, metadata?: any): Observable<ListModelsResponse>;
    GetModel(data: GetModelRequest, metadata?: any): Observable<GetModelResponse>;
    GetModelByIdentity(
        data: GetModelByIdentityRequest,
        metadata?: any
    ): Observable<GetModelResponse>;
    UpdateModel(data: UpdateModelRequest, metadata?: any): Observable<VehicleModel>;
    DeleteModel(data: DeleteModelRequest, metadata?: any): Observable<DeleteModelResponse>;
    ListUnits(data: ListUnitsRequest, metadata?: any): Observable<ListUnitsResponse>;
    CreateUnit(data: CreateUnitRequest, metadata?: any): Observable<CreateUnitResponse>;
    UpdateUnitStatus(data: UpdateUnitStatusRequest, metadata?: any): Observable<{ seconds: number | string; nanos: number }>;
    UpsertUnitConsumption(data: UpsertUnitConsumptionRequest, metadata?: any): Observable<VehicleUnitConsumption>;
    UpdateUnit(data: UpdateUnitRequest, metadata?: any): Observable<VehicleUnit>;
    GetUnit(data: GetUnitRequest, metadata?: any): Observable<GetUnitResponse>;
    DeleteUnit(data: DeleteUnitRequest, metadata?: any): Observable<DeleteUnitResponse>;
    GetUnitConsumptionProfile(data: GetUnitConsumptionProfileRequest, metadata?: any): Observable<GetUnitConsumptionProfileResponse>;
    ListModelLicenseRequirements(data: ListModelLicenseRequirementsRequest, metadata?: any): Observable<ListModelLicenseRequirementsResponse>;
    SetModelLicenseRequirements(data: SetModelLicenseRequirementsRequest, metadata?: any): Observable<SetModelLicenseRequirementsResponse>;
    DeleteModelLicenseRequirement(data: DeleteModelLicenseRequirementRequest, metadata?: any): Observable<DeleteModelLicenseRequirementResponse>;
}
