import { MachineType } from "../value-objects/machine-type";
import { ModelStatus } from "../value-objects/model-status";
import { ModelEngineSpec } from "./model-engine-spec";
import { LicenseRef } from "../value-objects/license-ref";

export interface VehicleModel {
    id: bigint;                    // DB: vehicle_models.model_id
    brand: string;
    family: string;
    trim?: string | null;
    yearFrom: number;              // DB: year_from
    yearTo?: number | null;        // DB: year_to
    machineType: MachineType;      // Enum tipado
    status: ModelStatus;           // Enum tipado
    version?: bigint;              // opcional en dominio
    createdAt?: Date;
    updatedAt?: Date;

    engine: ModelEngineSpec | null;
    defaultLicenses?: LicenseRef[];
}
