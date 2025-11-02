import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { MachineType } from '../../../domain/value-objects/machine-type';
import { EngineType } from '../../../domain/value-objects/engine-type';
import { ModelStatus } from '../../../domain/value-objects/model-status';

/** Licencia (solo salida) */
export class LicenseRefReadDto {
    @IsOptional() @IsString() licenseTypeCode?: string;
    @IsOptional() @IsString() licenseTypeId?: string;
}

/** Motor (salida) */
export class ModelEngineSpecReadDto {
    @IsEnum(EngineType) engineType!: EngineType;
    @Min(0.0001) baselineLPer100km!: number;
    @IsOptional() @Min(0) displacementCc?: number;
    @IsOptional() @Min(0) powerHp?: number;
}

/** Modelo (salida) */
export class VehicleModelReadDto {
    @IsString() modelId!: string;
    @IsString() @IsNotEmpty() brand!: string;
    @IsString() @IsNotEmpty() family!: string;
    @IsOptional() @IsString() trim?: string;

    @IsInt() yearFrom!: number;
    @IsOptional() @IsInt() yearTo?: number;

    @IsEnum(MachineType) machineType!: MachineType;
    @IsEnum(ModelStatus) status!: ModelStatus;

    @IsOptional() engine?: ModelEngineSpecReadDto | null;
    @IsOptional() defaultLicenses?: LicenseRefReadDto[];

    @IsOptional() @IsString() createdAt?: string;
    @IsOptional() @IsString() updatedAt?: string;
}
