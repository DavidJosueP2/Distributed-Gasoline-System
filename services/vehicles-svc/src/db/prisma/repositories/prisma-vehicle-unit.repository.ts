import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VehicleUnitRepository, Tx } from '../../../domain/repositories/vehicle-unit.repository';
import { VehicleUnit } from '../../../domain';
import { GrpcErrorMapper } from '../../../infra/errors/grpc-error.mapper';
import { Prisma } from '@prisma/client';
import { toOperationalStatus, OperationalStatus } from '../../../domain/value-objects/operational-status';

@Injectable()
export class PrismaVehicleUnitRepository implements VehicleUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Tx) { return tx ?? this.prisma; }

  async listAll(tx?: Tx): Promise<VehicleUnit[]> {
    try {
      const rows = await this.db(tx).vehicleUnit.findMany({
        where: { deletedAt: null },
        orderBy: { vehicleId: 'asc' },
        include: { consumption: true, unitLicReqs: true, model: { include: { engineSpec: true } } },
      });
      return rows.map(r => this.toDomain(r as any));
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async findById(id: bigint, tx?: Tx): Promise<VehicleUnit | null> {
    try {
      const r = await this.db(tx).vehicleUnit.findFirst({
        where: { vehicleId: id, deletedAt: null },
        include: { consumption: true, unitLicReqs: true, model: { include: { engineSpec: true } } },
      });
      return r ? this.toDomain(r as any) : null;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async findByPlate(plate: string, tx?: Tx): Promise<VehicleUnit | null> {
    try {
      const r = await this.db(tx).vehicleUnit.findFirst({
        where: { plate, deletedAt: null },
        include: { consumption: true, unitLicReqs: true, model: { include: { engineSpec: true } } },
      });
      return r ? this.toDomain(r as any) : null;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async existsPlate(plate: string, tx?: Tx): Promise<boolean> {
    try {
      const r = await this.db(tx).vehicleUnit.findFirst({
        where: { plate, deletedAt: null },
        select: { vehicleId: true }
      });
      return !!r;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async existsSerialVin(serialVin: string, tx?: Tx): Promise<boolean> {
    try {
      if (!serialVin) return false;
      const r = await this.db(tx).vehicleUnit.findFirst({
        where: { serialVin: serialVin, deletedAt: null },
        select: { vehicleId: true }
      });
      return !!r;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async create(unit: VehicleUnit, tx?: Tx): Promise<bigint> {
    try {
      const created = await this.db(tx).vehicleUnit.create({
        data: {
          modelId: unit.modelId,
          plate: unit.plate as string,
          serialVin: unit.serialVin ?? undefined,
          operationalStatus: unit.operationalStatus, // Ya es tipado, Prisma lo acepta directamente
          tankCapacityL: new Prisma.Decimal(unit.tankCapacityL),
          odometerKm: new Prisma.Decimal(unit.odometerKm),
        },
        select: { vehicleId: true },
      });
      return created.vehicleId as bigint;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async update(unit: VehicleUnit, tx?: Tx): Promise<void> {
    try {
      await this.db(tx).vehicleUnit.update({
        where: { vehicleId: unit.id },
        data: {
          plate: unit.plate as string,
          operationalStatus: unit.operationalStatus, // Ya es tipado
          tankCapacityL: new Prisma.Decimal(unit.tankCapacityL),
          odometerKm: new Prisma.Decimal(unit.odometerKm),
        },
      });
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async deleteById(id: bigint, expectedVersion?: bigint, tx?: Tx): Promise<void> {
    try {
      const when = new Date();
      const res = await this.db(tx).vehicleUnit.updateMany({
        where: { vehicleId: id, deletedAt: null },
        data: { deletedAt: when }
      });
      if (res.count === 0) {
        throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'Unit not found or already deleted' });
      }
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async withPessimisticLock<T>(id: bigint, fn: (locked: VehicleUnit) => Promise<T>, _opts?: { nowait?: boolean }, tx?: Tx): Promise<T> {
    const ent = await this.findById(id, tx);
    if (!ent) throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'Unit not found' });
    return fn(ent);
  }

  async findBySerialVin(serialVin: string, tx?: Tx): Promise<VehicleUnit | null> {
    try {
      const r = await this.db(tx).vehicleUnit.findFirst({
        where: { serialVin: serialVin, deletedAt: null },
        include: { consumption: true, unitLicReqs: true, model: { include: { engineSpec: true } } },
      });
      return r ? this.toDomain(r as any) : null;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async softDelete(id: bigint, tx?: Tx): Promise<Date> {
    try {
      const when = new Date();
      await this.db(tx).vehicleUnit.update({
        where: { vehicleId: id },
        data: { deletedAt: when },
      });
      return when;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async hasUnits(modelId: bigint, tx?: Tx): Promise<boolean> {
    try {
      const r = await this.db(tx).vehicleUnit.findFirst({ where: { modelId: modelId, deletedAt: null }, select: { vehicleId: true } });
      return !!r;
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  private toDomain(r: any): VehicleUnit {
    const modelBaseline = r.model?.engineSpec?.baselineLPer100km
      ? Number(r.model.engineSpec.baselineLPer100km)
      : undefined;
    const engineType = r.model?.engineSpec?.engineType as string | undefined;

    return {
      id: BigInt(r.vehicleId),
      modelId: BigInt(r.modelId),
      plate: r.plate,
      serialVin: r.serialVin ?? null,
      operationalStatus: toOperationalStatus(r.operationalStatus), // Conversión tipada
      tankCapacityL: Number(r.tankCapacityL),
      odometerKm: Number(r.odometerKm),
      version: r.version ? BigInt(r.version) : undefined,
      createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
      deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
      consumption: r.consumption ? {
        vehicleId: String(r.vehicleId),
        baselineOverrideLPer100Km: Number(r.consumption.baselineOverrideLPer100km),
        calibrationK: Number(r.consumption.calibrationK),
        updatedAt: r.consumption.updatedAt ? new Date(r.consumption.updatedAt) : undefined,
        modelBaselineLPer100Km: modelBaseline,
        engineType,
      } : undefined,
      // Filtrar licencias eliminadas lógicamente
      extraLicenses: r.unitLicReqs
        ?.filter((x: any) => x.deletedAt == null)
        .map((x: any) => ({
          code: x.licenseTypeCode ?? undefined,
          id: x.licenseTypeId ?? undefined,
        })) ?? undefined,
    };
  }
}
