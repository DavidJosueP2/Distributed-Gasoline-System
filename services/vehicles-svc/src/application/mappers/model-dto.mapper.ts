import { CreateModelDto} from "../dto/vehicles-models/create-model.dto";
import {UpdateModelDto} from "../dto/vehicles-models/update-model.dto";
import {ModelEngineSpec, VehicleModel} from "../../domain";
import {VehicleModelReadDto} from "../dto/vehicles-models/read-model.dto";
import { ModelStatus } from "../../domain/value-objects/model-status";
import { GetModelByIdentityDto } from "../dto/vehicles-models/get-model-by-identity.dto";

export const ModelDtoMapper = {
    toDomainFromCreate(dto: CreateModelDto): { model: VehicleModel; engine: ModelEngineSpec; licenses?: { code?: string; id?: bigint }[] } {
        const model: VehicleModel = {
            id: 0n as any,
            brand: dto.brand,
            family: dto.family,
            trim: dto.trim ?? null,
            yearFrom: dto.yearFrom,
            yearTo: dto.yearTo ?? null,
            machineType: dto.machineType, // Ya es del tipo correcto
            status: ModelStatus.ACTIVE,
            engine: null,
            defaultLicenses: dto.defaultLicenses?.map(x => ({
                code: x.code ?? x.licenseTypeCode,
                id: x.id ? BigInt(x.id) : (x.licenseTypeId ? BigInt(x.licenseTypeId) : undefined),
            })),
        };

        const engine: ModelEngineSpec = {
            engineType: dto.engine.engineType, // Ya es del tipo correcto
            baselineLPer100km: dto.engine.baselineLPer_100km,
            displacementCc: dto.engine.displacementCc,
            powerHp: dto.engine.powerHp,
        };

        const licenses = model.defaultLicenses?.map(l => ({ code: l.code, id: l.id }));

        return { model, engine, licenses };
    },

    toDomainFromUpdate(
        dto: UpdateModelDto
    ): Partial<Omit<VehicleModel, 'engine'>> & { id: bigint; version?: bigint; engine?: Partial<ModelEngineSpec> | null } {
        const result: Partial<Omit<VehicleModel, 'engine'>> & { id: bigint; version?: bigint; engine?: Partial<ModelEngineSpec> | null } = {
            id: BigInt(dto.modelId),
            version: dto.expectedVersion != null && dto.expectedVersion !== 0 ? BigInt(dto.expectedVersion) : undefined,
            status: dto.status,
            yearTo: dto.yearTo === undefined ? undefined : (dto.yearTo === 0 ? null : dto.yearTo),
            brand: dto.brand,
            family: dto.family,
            trim: dto.trim,
            yearFrom: dto.yearFrom,
            machineType: dto.machineType,
        };

        if (dto.engine !== undefined) {
            if (dto.engine === null) {
                result.engine = null;
            } else {
                const enginePatch: Partial<ModelEngineSpec> = {
                    ...(dto.engine.engineType != null && { engineType: dto.engine.engineType }),
                    ...(dto.engine.baselineLPer_100km != null && { baselineLPer100km: dto.engine.baselineLPer_100km }),
                    ...(dto.engine.displacementCc != null && { displacementCc: dto.engine.displacementCc }),
                    ...(dto.engine.powerHp != null && { powerHp: dto.engine.powerHp }),
                };
                if (Object.keys(enginePatch).length > 0) result.engine = enginePatch;
            }
        }

        return result;
    },

    /**
     * Convierte GetModelByIdentityDto a parámetros de búsqueda del dominio.
     * Normaliza trim y yearTo: "" o undefined => null
     */
    toIdentityFromDto(dto: GetModelByIdentityDto): {
        brand: string;
        family: string;
        trim: string | null;
        yearFrom: number;
        yearTo: number | null;
    } {
        return {
            brand: dto.brand,
            family: dto.family,
            trim: dto.trim && dto.trim !== '' ? dto.trim : null,
            yearFrom: dto.yearFrom,
            yearTo: dto.yearTo === undefined || dto.yearTo === 0 ? null : dto.yearTo,
        };
    },

    toRead(vm: VehicleModel): VehicleModelReadDto {
        return {
            modelId: vm.id.toString(),
            brand: vm.brand,
            family: vm.family,
            trim: vm.trim ?? undefined,
            yearFrom: vm.yearFrom,
            yearTo: vm.yearTo ?? undefined,
            machineType: vm.machineType, // Ya es del tipo correcto
            status: vm.status, // Ya es del tipo correcto
            createdAt: vm.createdAt?.toISOString(),
            updatedAt: vm.updatedAt?.toISOString(),
            engine: vm.engine
                ? {
                    engineType: vm.engine.engineType, // Ya es del tipo correcto
                    baselineLPer100km: vm.engine.baselineLPer100km,
                    displacementCc: vm.engine.displacementCc,
                    powerHp: vm.engine.powerHp,
                }
                : undefined,
            defaultLicenses: vm.defaultLicenses?.map(l => ({
                licenseTypeCode: l.code,
                licenseTypeId: l.id?.toString(),
            })),
        };
    },
};
