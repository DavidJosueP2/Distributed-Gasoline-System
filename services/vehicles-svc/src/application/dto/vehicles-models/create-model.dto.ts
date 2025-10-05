import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsEnum, ValidateNested, IsNumber, IsDefined, IsPositive } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MachineType } from '../../../domain/value-objects/machine-type';
import { EngineType } from '../../../domain/value-objects/engine-type';

export class EngineSpecDto {
    @Transform(({ value }) => {
        if (value === 1 || value === '1' || value === 'GASOLINE') return 'GASOLINE';
        if (value === 2 || value === '2' || value === 'DIESEL') return 'DIESEL';
        if (value === 3 || value === '3' || value === 'HYBRID') return 'HYBRID';
        return value;
    })
    @IsEnum(EngineType, { message: 'Tipo de motor inválido' })
    engineType!: EngineType;

    @Transform(({value, obj}) =>
        value ??
        obj?.baselineLPer_100km ??
        obj?.baseline_l_per_100km ??
        obj?.baselineLPer100km
    )
    @Type(() => Number)
    @IsDefined({ message: 'Consumo base requerido' })
    @IsNumber({}, { message: 'Consumo base debe ser numérico' })
    @IsPositive({ message: 'Consumo base debe ser mayor a 0' })
    baselineLPer_100km!: number;

    @Type(() => Number)
    @IsNumber({}, { message: 'Cilindrada debe ser numérica' })
    @Min(0, { message: 'Cilindrada debe ser >= 0' })
    displacementCc!: number;

    @Type(() => Number)
    @IsNumber({}, { message: 'Potencia debe ser numérica' })
    @Min(0, { message: 'Potencia debe ser >= 0' })
    powerHp!: number;
}

export class CreateModelDto {
    @Transform(({ value, obj }) => value ?? obj?.brand)
    @IsString({ message: 'Formato de marca inválido' })
    @IsNotEmpty({ message: 'La marca es requerida' })
    brand!: string;

    @IsString({ message: 'Formato de línea inválido' })
    @IsNotEmpty({ message: 'La línea es requerida' })
    family!: string;

    @IsOptional() @IsString({ message: 'Formato de versión inválido' })
    trim?: string;

    @Type(() => Number)
    @IsInt({ message: 'Año inicial inválido' })
    @Min(1901, { message: 'El año inicial mínimo es 1901' })
    yearFrom!: number;

    @IsOptional() @Type(() => Number) @IsInt({ message: 'Año final inválido' })
    yearTo?: number;

    @Transform(({ value }) => {
        if (value === 1 || value === '1' || value === 'LIGHT') return 'LIGHT';
        if (value === 2 || value === '2' || value === 'HEAVY') return 'HEAVY';
        return value;
    })
    @IsEnum(MachineType, { message: 'Tipo de máquina inválido' })
    machineType!: MachineType;

    @ValidateNested({ message: 'Estructura de motor inválida' })
    @Type(() => EngineSpecDto)
    engine!: EngineSpecDto;

    @IsOptional()
    defaultLicenses?: Array<{ code?: string; id?: string; licenseTypeCode?: string; licenseTypeId?: string }>;

    @IsOptional() @IsString({ message: 'Formato de llave de idempotencia inválido' })
    idempotencyKey?: string;
}
