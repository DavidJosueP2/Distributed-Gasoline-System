// src/application/services/vehicle-model.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { TransactionManager } from '../../db/prisma/transaction.manager';
import { TOKENS } from '../tokens';
import type { VehicleModelRepository } from '../../domain/repositories/vehicle-model.repository';
import type { ModelEngineSpecRepository } from '../../domain/repositories/model-engine-spec.repository';
import type { VehicleUnitRepository } from '../../domain/repositories/vehicle-unit.repository';
import {ModelEngineSpec, VehicleModel} from "../../domain";
import {RpcException} from "@nestjs/microservices";
import { status as GrpcStatus } from '@grpc/grpc-js';
import { CreateModelDto } from '../dto/vehicles-models/create-model.dto';
import { ModelDtoMapper } from '../mappers/model-dto.mapper';
import type { IdempotencyKeyRepository } from '../../domain/repositories/idempotency-key.repository';
import { ModelStatus, isValidModelStatus, toModelStatus } from '../../domain/value-objects/model-status';

type SaveModelInput = {
    model: VehicleModel;
    engine: ModelEngineSpec;
    licenses?: { code?: string; id?: bigint }[] | undefined;
};

type Identity = {
    brand: string;
    family: string;
    trim: string | null;
    yearFrom: number;
    yearTo: number | null;
};

type FindCriteria =
    | { id: bigint }
    | { identity: Identity };

@Injectable()
export class VehicleModelService {
    constructor(
        private readonly txm: TransactionManager,
        @Inject(TOKENS.VehicleModelRepository)
        private readonly modelRepo: VehicleModelRepository,
        @Inject(TOKENS.ModelEngineSpecRepository)
        private readonly engineRepo: ModelEngineSpecRepository,
        @Inject(TOKENS.IdempotencyKeyRepository)
        private readonly idemRepo: IdempotencyKeyRepository,
        @Inject(TOKENS.VehicleUnitRepository)
        private readonly unitRepo: VehicleUnitRepository,
    ) {}

    async createModel(dto: CreateModelDto): Promise<bigint> {
        // TODO: Validar cada licencia (dto.defaultLicenses) vía gRPC al microservicio de licencias/conductores
        //       antes de persistir; si alguna no existe o no aplica, devolver RpcException INVALID_ARGUMENT
        //       con estructura { fieldErrors: { 'defaultLicenses[i]': ['reason'] } }.

        // Verificación de unicidad por identidad de modelo
        const exists = await this.modelRepo.existsByIdentity(
            dto.brand,
            dto.family,
            dto.trim ?? null,
            dto.yearFrom,
            dto.yearTo ?? null,
        );

        if (exists) {
            throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: 'Vehicle model already exists' });
        }

        const { model, engine, licenses } = ModelDtoMapper.toDomainFromCreate(dto);
        const id = await this.saveModel({ model, engine, licenses });

        if (dto.idempotencyKey) {
            try {
                await this.idemRepo.useOnce(dto.idempotencyKey, 'vehicle_model', id);
            } catch { /* ignore */ }
        }

        return id;
    }

    async saveModel(input: SaveModelInput): Promise<bigint> {
        return this.txm.runInTx(async (tx) => {
            // Crear el modelo con sus licencias (el repositorio lo maneja en una sola operación)
            const id = await this.modelRepo.create(input.model, tx);

            // Guardar especificaciones del motor
            if (input.engine) {
                await this.engineRepo.upsertForModel(id, input.engine, tx);
            } else if (input.engine === null) {
                await this.engineRepo.deleteForModel(id, tx);
            }

            return id;
        });
    }

    async getByIdOrThrow(id: bigint) {
        const model = await this.modelRepo.findById(id);
        if (!model) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Vehicle model not found' });
        return model;
    }

    async getByIdentityOrThrow(identity: Identity) {
        const { brand, family, trim, yearFrom, yearTo } = identity;
        const model = await this.modelRepo.findByIdentity(brand, family, trim, yearFrom, yearTo);
        if (!model) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Vehicle model not found' });
        return model;
    }

    async getByCriteriaOrThrow(c: FindCriteria) {
        if ('id' in c) return this.getByIdOrThrow(c.id);
        return this.getByIdentityOrThrow(c.identity);
    }

    async listAll() {
        return this.modelRepo.listAll();
    }

    async deleteModel(modelId: bigint, expectedVersion?: bigint): Promise<void> {
        return this.txm.runInTx(async (tx) => {
            // 1. Verificar que el modelo exista
            const current = await this.modelRepo.findById(modelId, tx);
            if (!current) {
                throw new RpcException({
                    code: GrpcStatus.NOT_FOUND,
                    message: 'El modelo de vehículo no fue encontrado'
                });
            }

            // 2. Verificar optimistic lock si se proporciona versión esperada
            if (expectedVersion != null && expectedVersion !== 0n && current.version !== expectedVersion) {
                throw new RpcException({
                    code: GrpcStatus.ABORTED,
                    message: 'El modelo fue modificado por otro usuario. Por favor, recarga los datos e intenta nuevamente'
                });
            }

            // 3. VALIDACIÓN: No debe tener unidades asociadas
            const hasUnits = await this.unitRepo.hasUnits(modelId, tx);
            if (hasUnits) {
                throw new RpcException({
                    code: GrpcStatus.FAILED_PRECONDITION,
                    message: 'No se puede eliminar el modelo porque tiene vehículos asociados. Primero elimina o reasigna los vehículos'
                });
            }

            // 4. VALIDACIÓN: Debe estar en estado DEPRECATED
            if (current.status !== 'DEPRECATED') {
                throw new RpcException({
                    code: GrpcStatus.FAILED_PRECONDITION,
                    message: 'El modelo debe estar en estado DEPRECATED antes de poder eliminarlo. Actualiza el estado primero'
                });
            }

            // 5. VALIDACIÓN OPCIONAL: Debe tener yearTo definido (vigencia cerrada)
            if (current.yearTo == null) {
                throw new RpcException({
                    code: GrpcStatus.FAILED_PRECONDITION,
                    message: 'El modelo debe tener un año de vigencia final (yearTo) definido antes de eliminarlo'
                });
            }

            // 6. Eliminar dependencias en orden (transaccional)
            // 6.1. Eliminar especificaciones del motor
            try {
                await this.engineRepo.deleteForModel(modelId, tx);
            } catch (e: any) {
                // Si no existe, ignorar el error P2025 (registro no encontrado)
                if (e?.code !== 'P2025') throw e;
            }

            // 6.2. Las licencias (defaultLicenses) se eliminan automáticamente con el modelo
            //      ya que están almacenadas como parte del registro del modelo en la base de datos

            // 6.3. Eliminar el modelo (borrado lógico o físico según tu implementación)
            await this.modelRepo.deleteById(modelId, expectedVersion, tx);

            // Nota: Las idempotency_keys se pueden dejar o limpiar con un job batch posterior
        });
    }

    async updateModel(
        input: Partial<Omit<VehicleModel, 'engine'>> & { id: bigint; version?: bigint; engine?: Partial<ModelEngineSpec> | null }
    ): Promise<VehicleModel> {
        const current = await this.modelRepo.findById(input.id);
        if (!current) throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Vehicle model not found' });
        if (input.version != null && input.version !== 0n && current.version !== input.version)
            throw new RpcException({ code: GrpcStatus.ABORTED, message: 'Optimistic lock conflict' });

        const wantsBrand = input.brand != null && input.brand !== '' && input.brand !== current.brand;
        const wantsFamily = input.family != null && input.family !== '' && input.family !== current.family;
        const newTrimNorm = input.trim === '' ? null : (input.trim ?? undefined);
        const wantsTrim = newTrimNorm !== undefined && newTrimNorm !== (current.trim ?? null);
        const wantsYearFrom = input.yearFrom != null && input.yearFrom !== 0 && input.yearFrom !== current.yearFrom;
        const wantsMachineType = input.machineType != null && input.machineType !== current.machineType;
        const restrictedChange = wantsBrand || wantsFamily || wantsTrim || wantsYearFrom || wantsMachineType;
        if (restrictedChange) {
            const hasUnits = await this.unitRepo.hasUnits(current.id);
            if (hasUnits) throw new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message: 'Cannot modify identity fields; model has units' });
        }

        const updated: VehicleModel = { ...current };
        if (input.status != null) {
            if (!isValidModelStatus(input.status))
                throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: 'Invalid status' });
            updated.status = input.status;
        }
        if (input.yearTo !== undefined) {
            if (input.yearTo != null && input.yearTo < updated.yearFrom)
                throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: 'yearTo cannot be < yearFrom' });
            updated.yearTo = input.yearTo === null || input.yearTo === 0 ? null : input.yearTo;
        }
        if (wantsBrand) updated.brand = input.brand!.trim();
        if (wantsFamily) updated.family = input.family!.trim();
        if (wantsTrim) updated.trim = newTrimNorm === undefined ? current.trim ?? null : (newTrimNorm ?? null);
        if (wantsYearFrom) updated.yearFrom = input.yearFrom!;
        if (wantsMachineType) updated.machineType = input.machineType as any;

        if (restrictedChange || (input.yearTo !== undefined && input.yearTo !== current.yearTo)) {
            const other = await this.modelRepo.findByIdentity(updated.brand, updated.family, updated.trim ?? null, updated.yearFrom, updated.yearTo ?? null);
            if (other && other.id !== updated.id) throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: 'Conflicting model identity' });
        }

        if (updated.version == null) throw new RpcException({ code: GrpcStatus.ABORTED, message: 'Missing current version for update' });

        return this.txm.runInTx(async (tx) => {
            await this.modelRepo.update(updated, tx);

            if (input.engine !== undefined) {
                if (input.engine === null) {
                    try { await this.engineRepo.deleteForModel(updated.id, tx); } catch (e: any) { if (e?.code !== 'P2025') throw e; }
                } else if (Object.keys(input.engine).length > 0) {
                    const currentEngine = current.engine;
                    if (!currentEngine)
                        throw new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message: 'Model does not have engine specs to update' });

                    const updatedEngine: ModelEngineSpec = {
                        engineType: input.engine.engineType ?? currentEngine.engineType,
                        baselineLPer100km: input.engine.baselineLPer100km ?? currentEngine.baselineLPer100km,
                        displacementCc: input.engine.displacementCc ?? currentEngine.displacementCc,
                        powerHp: input.engine.powerHp ?? currentEngine.powerHp,
                    };

                    await this.engineRepo.upsertForModel(updated.id, updatedEngine, tx);
                }
            }

            const reloaded = await this.modelRepo.findById(updated.id, tx);
            return reloaded!;
        });
    }

    /**
     * Lista las licencias requeridas para un modelo.
     */
    async listModelLicenses(modelId: bigint): Promise<{ code?: string; id?: bigint }[]> {
        const model = await this.getByIdOrThrow(modelId);
        return model.defaultLicenses ?? [];
    }

    /**
     * Establece (reemplaza) el array completo de licencias requeridas para un modelo.
     * Aplica soft-unique: elimina duplicados antes de guardar.
     */
    async setModelLicenses(
        modelId: bigint,
        licenses: { code?: string; id?: bigint }[]
    ): Promise<{ code?: string; id?: bigint }[]> {
        const model = await this.getByIdOrThrow(modelId);

        // TODO: Validar cada licencia vía gRPC al microservicio de licencias/conductores
        //       antes de persistir; si alguna no existe o no aplica, devolver RpcException INVALID_ARGUMENT

        // Aplicar soft-unique: eliminar duplicados
        const uniqueLicenses = this.removeDuplicateLicenses(licenses);

        return this.txm.runInTx(async (tx) => {
            // Actualizar el modelo con las nuevas licencias
            const updated = {
                ...model,
                defaultLicenses: uniqueLicenses,
            };
            await this.modelRepo.update(updated, tx);

            return uniqueLicenses;
        });
    }

    /**
     * Elimina una licencia específica de un modelo.
     * Se puede identificar la licencia por código o por ID.
     */
    async deleteModelLicense(
        modelId: bigint,
        licenseRef: { code?: string; id?: bigint }
    ): Promise<{ code?: string; id?: bigint }[]> {
        const model = await this.getByIdOrThrow(modelId);

        if (!model.defaultLicenses || model.defaultLicenses.length === 0) return [];

        const remaining = model.defaultLicenses.filter(lic => {
            if (licenseRef.code && lic.code === licenseRef.code) return false;
            return !(licenseRef.id && lic.id === licenseRef.id);
        });

        return this.txm.runInTx(async (tx) => {
            // Actualizar el modelo con las licencias restantes
            const updated = {
                ...model,
                defaultLicenses: remaining,
            };
            await this.modelRepo.update(updated, tx);

            return remaining;
        });
    }

    /**
     * Elimina duplicados de un array de licencias.
     * Una licencia se considera duplicada si tiene el mismo código O el mismo ID.
     */
    private removeDuplicateLicenses(licenses: { code?: string; id?: bigint }[]): { code?: string; id?: bigint }[] {
        const seen = new Set<string>();
        const unique: { code?: string; id?: bigint }[] = [];

        for (const lic of licenses) {
            const key = lic.code ? `code:${lic.code}` : lic.id ? `id:${lic.id}` : '';
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(lic);
            }
        }

        return unique;
    }
}
