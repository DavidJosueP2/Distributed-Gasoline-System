import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class UpdateRouteDto {
  @IsNumber({}, { message: 'El ID debe ser un número.' })
  @Type(() => Number)
  id!: number;

  @IsOptional()
  @IsString({ message: 'El nombre de la ruta debe ser una cadena de texto.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'El nombre de origen debe ser una cadena de texto.' })
  originName?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La latitud de origen debe ser un número.' })
  @Type(() => Number)
  originLat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud de origen debe ser un número.' })
  @Type(() => Number)
  originLng?: number;

  @IsOptional()
  @IsString({ message: 'El nombre de destino debe ser una cadena de texto.' })
  destinationName?: string;

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
