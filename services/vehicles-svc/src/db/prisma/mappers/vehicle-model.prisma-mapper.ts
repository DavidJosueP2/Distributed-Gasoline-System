import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { LicenseRef } from '../../../domain/value-objects/license-ref';
import { VehicleModel } from "../../../domain";
import { toEngineType } from '../../../domain/value-objects/engine-type';
import { toMachineType } from '../../../domain/value-objects/machine-type';
import { toModelStatus, ModelStatus } from '../../../domain/value-objects/model-status';

export type PrismaVehicleModelRow = Prisma.VehicleModelGetPayload<{
    include: { engineSpec: true; modelLicReqs: true };
}>;

export class VehicleModelPrismaMapper {
    static toDomain(row: PrismaVehicleModelRow): VehicleModel {
        // Filtrar engineSpec eliminado lógicamente
        const engine = row.engineSpec && row.engineSpec.deletedAt == null
            ? {
                engineType: toEngineType(row.engineSpec.engineType), // Conversión tipada
                baselineLPer100km: this.numFromDecimal(row.engineSpec.baselineLPer100km)!,
                displacementCc: this.numFromDecimal(row.engineSpec.displacementCc)!,
                powerHp: this.numFromDecimal(row.engineSpec.powerHp)!,
            }
            : null;

        // Filtrar licencias eliminadas lógicamente
        const licenses: LicenseRef[] | undefined = row.modelLicReqs
            ?.filter((r) => r.deletedAt == null)
            .map((r) => ({
                code: r.licenseTypeCode ?? undefined,
                id: r.licenseTypeId ?? undefined,
            }));

        return {
            id: BigInt(row.modelId),
            brand: row.brand,
            family: row.family,
            trim: row.trim,
            yearFrom: row.yearFrom,
            yearTo: row.yearTo ?? null,
            machineType: toMachineType(row.machineType), // Conversión tipada
            status: toModelStatus(row.status), // Conversión tipada
            version: BigInt(row.version ?? 0),
            createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
            updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
            engine,
            defaultLicenses: licenses,
        };
    }

    static toCreateData(model: VehicleModel): Prisma.VehicleModelCreateInput {
        return {
            brand: model.brand,
            family: model.family,
            trim: model.trim ?? null,
            yearFrom: model.yearFrom,
            yearTo: model.yearTo ?? null,
            machineType: model.machineType, // Ya es tipado, Prisma lo acepta
            status: model.status ?? ModelStatus.ACTIVE, // Usa el enum tipado
        };
    }

    static toEngineCreateNested(modelId: bigint, engine?: VehicleModel['engine'])
        : Prisma.ModelEngineSpecCreateInput | null {
        if (!engine) return null;
        return {
            model: { connect: { modelId: modelId } },
            engineType: engine.engineType, // Ya es tipado
            displacementCc: this.dec(engine.displacementCc),
            powerHp: this.dec(engine.powerHp),
            baselineLPer100km: this.dec(engine.baselineLPer100km),
        };
    }

    static toLicReqsCreateMany(modelId: bigint, refs?: LicenseRef[]) {
        return this.normalizeLicenseRefs(refs).map((r) => ({
            modelId: modelId,
            licenseTypeCode: r.code ?? null,
            licenseTypeId: r.id ?? null,
        }));
    }

    // Helpers
    static numOrDecimal(v: number | undefined | null): Prisma.Decimal {
        return v == null ? this.dec(0) : this.dec(v);
    }
    static numFromDecimal(v: any): number | undefined {
        if (v == null) return undefined;
        if (typeof v === 'number') return v;
        return new Decimal((v as Prisma.Decimal).toString()).toNumber();
    }
    static dec(v: number | string | Decimal): Prisma.Decimal {
        return new Prisma.Decimal(v as any);
    }
    static normalizeLicenseRefs(refs?: LicenseRef[]): LicenseRef[] {
        if (!refs) return [];
        return refs
            .map((r) => ({ code: r.code ?? undefined, id: r.id ?? undefined }))
            .filter((r) => r.code != null || r.id != null);
    }
}
