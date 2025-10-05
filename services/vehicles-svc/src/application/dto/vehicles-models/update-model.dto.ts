import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsEnum, IsNumber, IsPositive, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ModelStatus } from '../../../domain/value-objects/model-status';
import { EngineType } from '../../../domain/value-objects/engine-type';
import { MachineType } from '../../../domain/value-objects/machine-type';

export class EngineSpecUpdateDto {
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 1 || value === '1' || value === 'GASOLINE') return 'GASOLINE';
        if (value === 2 || value === '2' || value === 'DIESEL') return 'DIESEL';
        if (value === 3 || value === '3' || value === 'HYBRID') return 'HYBRID';
        return value;
    })
    @IsEnum(EngineType, { message: 'Tipo de motor inválido' })
    engineType?: EngineType;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Consumo base debe ser numérico' })
    @IsPositive({ message: 'Consumo base debe ser mayor a 0' })
    baselineLPer_100km?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Cilindrada debe ser numérica' })
    @Min(0, { message: 'Cilindrada debe ser >= 0' })
    displacementCc?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Potencia debe ser numérica' })
    @Min(0, { message: 'Potencia debe ser >= 0' })
    powerHp?: number;
}

@ValidatorConstraint({ name: 'YearRangeConstraint', async: false })
class YearRangeConstraint implements ValidatorConstraintInterface {
    validate(_: any, args: ValidationArguments): boolean {
        const o = args.object as UpdateModelDto;
        if (o.yearFrom != null && o.yearTo != null) {
            return Number(o.yearFrom) <= Number(o.yearTo);
        }
        return true;
    }
    defaultMessage(): string {
        return 'El año inicial no puede ser mayor que el año final';
    }
}

export class UpdateModelDto {
    @Type(() => Number)
    @Transform(({ value, obj }) => value ?? obj?.model_id ?? obj?.modelId)
    @IsNotEmpty({ message: 'El ID del modelo es requerido' })
    @IsNumber({}, { message: 'El ID del modelo debe ser numérico' })
    @IsPositive({ message: 'El ID del modelo debe ser mayor a 0' })
    modelId!: number | string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'La versión esperada debe ser numérica' })
    @Min(0, { message: 'La versión esperada debe ser >= 0' })
    expectedVersion?: number | string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 1 || value === '1' || value === 'ACTIVE') return 'ACTIVE';
        if (value === 2 || value === '2' || value === 'DEPRECATED') return 'DEPRECATED';
        return value;
    })
    @IsEnum(ModelStatus, { message: 'Estado del modelo inválido (ACTIVE o DEPRECATED)' })
    status?: ModelStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Año final inválido' })
    @Min(0, { message: 'Año final debe ser >= 0' })
    @Validate(YearRangeConstraint)
    yearTo?: number | null;

    @IsOptional()
    @IsString({ message: 'Formato de marca inválido' })
    @IsNotEmpty({ message: 'La marca no puede estar vacía' })
    brand?: string;

    @IsOptional()
    @IsString({ message: 'Formato de línea inválido' })
    @IsNotEmpty({ message: 'La línea no puede estar vacía' })
    family?: string;

    @IsOptional()
    @IsString({ message: 'Formato de versión inválido' })
    trim?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Año inicial inválido' })
    @Min(1901, { message: 'El año inicial mínimo es 1901' })
    yearFrom?: number;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 1 || value === '1' || value === 'LIGHT') return 'LIGHT';
        if (value === 2 || value === '2' || value === 'HEAVY') return 'HEAVY';
        return value;
    })
    @IsEnum(MachineType, { message: 'Tipo de máquina inválido (LIGHT o HEAVY)' })
    machineType?: MachineType;

    @IsOptional()
    @ValidateNested({ message: 'Estructura de motor inválida' })
    @Type(() => EngineSpecUpdateDto)
    engine?: EngineSpecUpdateDto;
}
