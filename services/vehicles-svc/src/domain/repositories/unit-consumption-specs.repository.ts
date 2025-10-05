import {UnitConsumptionSpecs} from "../entities/unit-consumption-specs";
import { Prisma } from '@prisma/client';
export type Tx = Prisma.TransactionClient;

export interface UnitConsumptionSpecsRepository {
    findByVehicleId(vehicleId: bigint, tx?: Tx): Promise<UnitConsumptionSpecs | null>;
    upsert(specs: UnitConsumptionSpecs, tx?: Tx): Promise<void>;
}