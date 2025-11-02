import { Plate } from "../value-objects/plate";
import { OperationalStatus } from "../value-objects/operational-status";
import {UnitConsumptionSpecs} from "./unit-consumption-specs";
import {LicenseRef} from "../value-objects/license-ref";

export interface VehicleUnit {
    id: bigint;                          // DB: vehicle_units.vehicle_id
    modelId: bigint;                     // DB: model_id
    plate: Plate;                        // DB: plate (citext)
    serialVin?: string | null;           // DB: serial_vin (citext, único) (opcional)
    operationalStatus: OperationalStatus; // Enum tipado (incluye ON_ROUTE)
    tankCapacityL: number;               // DB: tank_capacity_l (obligatorio)
    odometerKm: number;                  // DB: odometer_km (obligatorio, default 0)
    version?: bigint;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null; // Soft delete marker

    consumption?: UnitConsumptionSpecs | undefined; // 1:1 (puede no existir aún)
    extraLicenses?: LicenseRef[];        // 0..n
}
