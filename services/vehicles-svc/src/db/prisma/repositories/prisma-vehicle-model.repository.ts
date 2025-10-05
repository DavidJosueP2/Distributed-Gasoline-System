import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {Tx, VehicleModelRepository} from "../../../domain/repositories/vehicle-model.repository";
import {VehicleModel} from "../../../domain";
import {VehicleModelPrismaMapper} from "../mappers/vehicle-model.prisma-mapper";
import {GrpcErrorMapper} from "../../../infra/errors/grpc-error.mapper";
import {PrismaService} from "../prisma.service";

@Injectable()
export class PrismaVehicleModelRepository implements VehicleModelRepository {
    constructor(private readonly prisma: PrismaService) {}

    private db(tx?: Tx) { return tx ?? this.prisma; }

    async listAll() {
        try {
            const rows = await this.prisma.vehicleModel.findMany({
                where: { deletedAt: null },
                orderBy: { modelId: 'asc' },
                include: { engineSpec: true, modelLicReqs: true },
            });
            return rows.map((r) => VehicleModelPrismaMapper.toDomain(r));
        } catch (e) {
            throw GrpcErrorMapper.toRpc(e);
        }
    }

    async findById(id: bigint, tx?: Tx): Promise<VehicleModel | null> {
        try {
            const row = await this.db(tx).vehicleModel.findFirst({
                where: { modelId: id, deletedAt: null },
                include: { engineSpec: true, modelLicReqs: true },
            });
            return row ? VehicleModelPrismaMapper.toDomain(row) : null;
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async findByIdentity(
        brand: string,
        family: string,
        trim: string | null,
        yearFrom: number,
        yearTo: number | null,
        tx?: Tx
    ) {
        try {
            const row = await this.db(tx).vehicleModel.findFirst({
                where: {
                    brand,
                    family,
                    trim: trim ?? null,
                    yearFrom: yearFrom,
                    yearTo: yearTo ?? null,
                    deletedAt: null,
                },
                include: { engineSpec: true, modelLicReqs: true },
                orderBy: { modelId: 'asc' },
            });
            return row ? VehicleModelPrismaMapper.toDomain(row) : null;
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async existsByIdentity(brand: string, family: string, trim: string | null, yearFrom: number, yearTo: number | null, tx?: Tx): Promise<boolean> {
        try {
            const found = await this.db(tx).vehicleModel.findFirst({
                where: {
                    brand,
                    family,
                    trim: trim ?? undefined,
                    yearFrom: yearFrom,
                    yearTo: yearTo ?? undefined,
                    deletedAt: null
                },
                select: { modelId: true },
            });
            return !!found;
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async create(model: VehicleModel, tx?: Tx): Promise<bigint> {
        try {
            const baseData = VehicleModelPrismaMapper.toCreateData(model);

            // Si hay licencias, agregarlas como nested create
            const licensesForCreate = model.defaultLicenses && model.defaultLicenses.length > 0
                ? model.defaultLicenses.map(lic => ({
                    licenseTypeCode: lic.code ?? null,
                    licenseTypeId: lic.id ?? null,
                }))
                : undefined;

            const dataWithLicenses: Prisma.VehicleModelCreateInput = {
                ...baseData,
                modelLicReqs: licensesForCreate
                    ? {
                        createMany: {
                            data: licensesForCreate,
                            skipDuplicates: true,
                        }
                    }
                    : undefined,
            };

            const created = await this.db(tx).vehicleModel.create({
                data: dataWithLicenses,
                select: { modelId: true },
            });

            return created.modelId as bigint;
        } catch (e) {
            throw GrpcErrorMapper.toRpc(e);
        }
    }

    async update(model: VehicleModel, tx?: Tx): Promise<void> {
        try {
            if (model.version == null) {
                throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'expectedVersion is required' });
            }

            // Actualizar campos básicos del modelo
            const res = await this.db(tx).vehicleModel.updateMany({
                where: { modelId: model.id, version: model.version },
                data: {
                    brand: model.brand,
                    family: model.family,
                    trim: model.trim ?? undefined,
                    yearFrom: model.yearFrom,
                    yearTo: model.yearTo ?? undefined,
                    machineType: model.machineType, // Ya es tipado
                    status: model.status, // Ya es tipado
                    version: { increment: 1 },
                },
            });

            if (res.count === 0) {
                throw GrpcErrorMapper.toRpc({ code: 'ABORTED', message: 'Optimistic lock conflict' });
            }

            // Sincronizar licencias: borrado lógico de existentes y crear las nuevas
            if (model.defaultLicenses !== undefined) {
                // 1. Borrado lógico de todas las licencias existentes del modelo
                const when = new Date();
                await this.db(tx).modelLicenseRequirement.updateMany({
                    where: { modelId: model.id, deletedAt: null },
                    data: { deletedAt: when }
                });

                // 2. Crear las nuevas licencias (si hay)
                if (model.defaultLicenses.length > 0) {
                    const licensesToCreate = VehicleModelPrismaMapper.toLicReqsCreateMany(
                        model.id,
                        model.defaultLicenses
                    );
                    await this.db(tx).modelLicenseRequirement.createMany({
                        data: licensesToCreate,
                        skipDuplicates: true, // Por si acaso hay duplicados
                    });
                }
            }
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async deleteById(id: bigint, expectedVersion?: bigint, tx?: Tx): Promise<void> {
        try {
            const when = new Date();
            if (expectedVersion != null) {
                const res = await this.db(tx).vehicleModel.updateMany({
                    where: { modelId: id, version: expectedVersion, deletedAt: null },
                    data: { deletedAt: when }
                });
                if (res.count === 0) {
                    throw GrpcErrorMapper.toRpc({ code: 'ABORTED', message: 'Optimistic lock conflict or model not found' });
                }
                return;
            }
            const res = await this.db(tx).vehicleModel.updateMany({
                where: { modelId: id, deletedAt: null },
                data: { deletedAt: when }
            });
            if (res.count === 0) {
                throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'Model not found or already deleted' });
            }
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }

    async softDelete(id: bigint, expectedVersion?: bigint, tx?: Tx): Promise<Date> {
        try {
            const when = new Date();
            if (expectedVersion != null) {
                const res = await this.db(tx).vehicleModel.updateMany({
                    where: { modelId: id, version: expectedVersion, deletedAt: null },
                    data: { deletedAt: when }
                });
                if (res.count === 0) {
                    throw GrpcErrorMapper.toRpc({ code: 'ABORTED', message: 'Optimistic lock conflict or model not found' });
                }
                return when;
            }
            const res = await this.db(tx).vehicleModel.updateMany({
                where: { modelId: id, deletedAt: null },
                data: { deletedAt: when }
            });
            if (res.count === 0) {
                throw GrpcErrorMapper.toRpc({ code: 'P2025', message: 'Model not found or already deleted' });
            }
            return when;
        } catch (e) { throw GrpcErrorMapper.toRpc(e); }
    }
}