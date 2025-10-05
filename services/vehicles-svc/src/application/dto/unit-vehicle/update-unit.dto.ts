import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateUnitDto {
  @Transform(({ value, obj }) => value ?? obj?.vehicle_id)
  @IsString() @IsNotEmpty()
  vehicleId!: string;

  @IsOptional()
  @IsString({ message: 'Placa inválida' })
  @Matches(/^[A-Z0-9-]{3,15}$/i, { message: 'Formato de placa inválido' })
  @Transform(({value}) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  plate?: string;

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'Capacidad debe ser numérica' }) @Min(0.01, { message: 'Capacidad debe ser positiva' })
  tankCapacityL?: number;

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'Odómetro debe ser numérico' }) @Min(0, { message: 'Odómetro no puede ser negativo' })
  odometerKm?: number;
}
