import { IsString, IsNotEmpty, IsOptional, Matches, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConsumptionCreateDto } from './common/consumption-create.dto';
import { LicenseRefDto } from './license-ref.dto';

export class CreateUnitDto {
  @IsString({ message: 'modelId debe ser texto numérico' })
  @Matches(/^\d+$/, { message: 'modelId debe contener solo dígitos' })
  @IsNotEmpty({ message: 'modelId requerido' })
  modelId!: string;

  @IsString({ message: 'Placa inválida' })
  @IsNotEmpty({ message: 'Placa requerida' })
  @Matches(/^[A-Z0-9-]{3,15}$/i, { message: 'Formato de placa inválido' })
  @Transform(({value}) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  plate!: string;

  @IsOptional() @IsString()
  serialVin?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Capacidad del tanque debe ser numérica' })
  @Min(0.01, { message: 'Capacidad del tanque debe ser positiva' })
  tankCapacityL!: number;

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'Odómetro debe ser numérico' }) @Min(0, { message: 'Odómetro no puede ser negativo' })
  odometerKm?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsumptionCreateDto)
  consumption?: ConsumptionCreateDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LicenseRefDto)
  extraLicenses?: LicenseRefDto[];
}
