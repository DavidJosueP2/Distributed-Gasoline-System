import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UnitConsumptionSpecsRepository, Tx } from '../../../domain/repositories/unit-consumption-specs.repository';
import { UnitConsumptionSpecs } from '../../../domain/entities/unit-consumption-specs';
import { GrpcErrorMapper } from '../../../infra/errors/grpc-error.mapper';

@Injectable()
export class PrismaUnitConsumptionSpecsRepository implements UnitConsumptionSpecsRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: Tx) { return tx ?? this.prisma; }

  async findByVehicleId(vehicleId: bigint, tx?: Tx): Promise<UnitConsumptionSpecs | null> {
    try {
      const row = await this.db(tx).unitConsumptionSpec.findUnique({ where: { vehicleId: vehicleId } });
      if (!row) return null;
      return {
        vehicleId: String(row.vehicleId),
        baselineOverrideLPer100Km: row.baselineOverrideLPer100km ? Number(row.baselineOverrideLPer100km) : 0,
        calibrationK: Number(row.calibrationK),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      };
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }

  async upsert(specs: UnitConsumptionSpecs, tx?: Tx): Promise<void> {
    try {
      const exists = await this.db(tx).unitConsumptionSpec.findUnique({ where: { vehicleId: BigInt(specs.vehicleId) } });

      const data = {
        baselineOverrideLPer100km: specs.baselineOverrideLPer100Km,
        calibrationK: specs.calibrationK ?? 1,
      };

      if (exists) {
        await this.db(tx).unitConsumptionSpec.update({
          where: { vehicleId: BigInt(specs.vehicleId) },
          data,
        });
      } else {
        await this.db(tx).unitConsumptionSpec.create({
          data: {
            vehicleId: BigInt(specs.vehicleId),
            ...data,
          },
        });
      }
    } catch (e) { throw GrpcErrorMapper.toRpc(e); }
  }
}
