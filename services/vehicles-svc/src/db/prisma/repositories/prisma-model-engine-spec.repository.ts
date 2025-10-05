import {Injectable} from "@nestjs/common";
import {ModelEngineSpecRepository, Tx} from "../../../domain/repositories/model-engine-spec.repository";
import {PrismaService} from "../prisma.service";
import {ModelEngineSpec} from "../../../domain";
import {GrpcErrorMapper} from "../../../infra/errors/grpc-error.mapper";
import {VehicleModelPrismaMapper} from "../mappers/vehicle-model.prisma-mapper";

@Injectable()
export class PrismaModelEngineSpecRepository implements ModelEngineSpecRepository {
    constructor(private readonly prisma: PrismaService) {}

    private db(tx?: Tx) { return tx ?? this.prisma; }

    async findByModelId(modelId: bigint, tx?: Tx): Promise<ModelEngineSpec | null> {
        try {
            const row = await this.db(tx).modelEngineSpec.findFirst({
                where: { modelId: modelId, deletedAt: null }
            });
            if (!row) return null;
            return {
                engineType: row.engineType as any,
                baselineLPer100km: Number(row.baselineLPer100km),
                displacementCc: Number(row.displacementCc),
                powerHp: Number(row.powerHp),
            };
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async upsertForModel(modelId: bigint, spec: ModelEngineSpec, tx?: Tx): Promise<void> {
        try {
            const exists = await this.db(tx).modelEngineSpec.findUnique({ where: { modelId: modelId } });

            if (exists) {
                await this.db(tx).modelEngineSpec.update({
                    where: { modelId: modelId },
                    data: {
                        engineType: spec.engineType,
                        displacementCc: VehicleModelPrismaMapper.dec(spec.displacementCc ?? 0),
                        powerHp: VehicleModelPrismaMapper.dec(spec.powerHp ?? 0),
                        baselineLPer100km: VehicleModelPrismaMapper.dec(spec.baselineLPer100km),
                    },
                });
            } else {
                await this.db(tx).modelEngineSpec.create({
                    data: {
                        model: { connect: { modelId: modelId } },
                        engineType: spec.engineType,
                        displacementCc: VehicleModelPrismaMapper.dec(spec.displacementCc ?? 0),
                        powerHp: VehicleModelPrismaMapper.dec(spec.powerHp ?? 0),
                        baselineLPer100km: VehicleModelPrismaMapper.dec(spec.baselineLPer100km),
                    },
                });
            }
        } catch (e) {
            throw GrpcErrorMapper.toRpc(e);
        }
    }

    async deleteForModel(modelId: bigint, tx?: Tx): Promise<void> {
        try {
            const when = new Date();
            const res = await this.db(tx).modelEngineSpec.updateMany({
                where: { modelId: modelId, deletedAt: null },
                data: { deletedAt: when }
            });
            if (res.count === 0) {
                throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'Engine spec not found or already deleted' });
            }
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }
}