import {VehicleUnit} from "../entities/vehicle-unit";
import { MachineType } from "../value-objects/machine-type";
import { Prisma } from 'prisma-client';
export type Tx = Prisma.TransactionClient;

export interface VehicleUnitRepository {
    listAll(machineTypeFilter?: MachineType, tx?: Tx): Promise<VehicleUnit[]>; // sólo no eliminados
    findById(id: bigint, tx?: Tx): Promise<VehicleUnit | null>; // sólo no eliminado
    findByPlate(plate: string, tx?: Tx): Promise<VehicleUnit | null>; // sólo no eliminado
    findBySerialVin(serialVin: string, tx?: Tx): Promise<VehicleUnit | null>; // sólo no eliminado
    existsPlate(plate: string, tx?: Tx): Promise<boolean>;
    existsSerialVin(serialVin: string, tx?: Tx): Promise<boolean>; // nuevo
    create(unit: VehicleUnit, tx?: Tx): Promise<bigint>;
    update(unit: VehicleUnit, tx?: Tx): Promise<void>; // Optimistic Lock
    deleteById(id: bigint, expectedVersion?: bigint, tx?: Tx): Promise<void>; // físico (no usar si soft delete)
    softDelete(id: bigint, tx?: Tx): Promise<Date>; // marca deleted_at
    hasUnits(modelId: bigint, tx?: Tx): Promise<boolean>; // existencia de unidades no eliminadas para modelo

    // Pessimistic Lock
    withPessimisticLock<T>(
        id: bigint,
        fn: (locked: VehicleUnit) => Promise<T>,
        opts?: { nowait?: boolean },
        tx?: Tx
    ): Promise<T>;

    // Listar unidades con detalles (licencias y tipo)
    listAllWithDetails(filters?: {
        machineTypeFilter?: MachineType;
        licenseTypeCodesFilter?: string[];
        statusFilter?: string;
        platePrefix?: string;
        modelIdFilter?: bigint;
    }, tx?: Tx): Promise<Array<{ unit: VehicleUnit; requiredLicenses: string[]; machineType: MachineType }>>;
}