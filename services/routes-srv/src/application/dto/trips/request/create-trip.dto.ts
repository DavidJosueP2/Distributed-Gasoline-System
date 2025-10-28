import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @IsNumber({}, { message: 'El ID de la ruta debe ser un número.' })
  @Type(() => Number)
  routeId!: number;

  @IsNumber({}, { message: 'El ID del supervisor debe ser un número.' })
  @Type(() => Number)
  supervisorId!: number;

  @IsNumber({}, { message: 'El ID del conductor debe ser un número.' })
  @Type(() => Number)
  driverId!: number;

  @IsNumber({}, { message: 'El ID del vehículo debe ser un número.' })
  @Type(() => Number)
  vehicleId!: number;
}
