import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTripDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;

  @IsOptional()
  @IsNumber({}, { message: 'El ID del conductor debe ser un número.' })
  @Type(() => Number)
  driverId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El ID del vehículo debe ser un número.' })
  @Type(() => Number)
  vehicleId?: number;
}
