import { IsNotEmpty, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DeleteModelDto {
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
}

