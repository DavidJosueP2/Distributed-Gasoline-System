import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class UpdateRouteDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  name?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La latitud de origen debe ser un número.' })
  @Type(() => Number)
  originLat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud de origen debe ser un número.' })
  @Type(() => Number)
  originLng?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La latitud de destino debe ser un número.' })
  @Type(() => Number)
  destinationLat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud de destino debe ser un número.' })
  @Type(() => Number)
  destinationLng?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La distancia debe ser un número.' })
  @Min(0, { message: 'La distancia debe ser mayor o igual a 0.' })
  @Type(() => Number)
  distanceKm?: number;

  @IsOptional()
  @IsEnum(VehicleType, { message: 'El tipo de vehículo debe ser LIVIANO, PESADO o CUALQUIERA.' })
  vehicleType?: VehicleType;
}
