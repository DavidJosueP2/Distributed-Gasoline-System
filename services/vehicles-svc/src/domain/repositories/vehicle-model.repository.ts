import {VehicleModel} from "../entities/vehicle-model";
import { MachineType } from "../value-objects/machine-type";
import { Prisma } from 'prisma-client';

export type Tx = Prisma.TransactionClient;

export interface VehicleModelRepository {
    listAll(machineTypeFilter?: MachineType): Promise<VehicleModel[]>;
    findById(id: bigint, tx?: Tx): Promise<VehicleModel | null>;
    findByIdentity(
        brand: string,
        family: string,
        trim: string | null,
        yearFrom: number,
        yearTo: number | null,
        tx?: Tx
    ): Promise<VehicleModel | null>;
    existsByIdentity(
        brand: string, family: string, trim: string | null, yearFrom: number, yearTo: number | null, tx?: Tx
    ): Promise<boolean>;
    create(model: VehicleModel, tx?: Tx): Promise<bigint>;
    update(model: VehicleModel, tx?: Tx): Promise<void>;
    deleteById(id: bigint, expectedVersion?: bigint, tx?: Tx): Promise<void>;
}
