import { IsNotEmpty, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class CreateRouteDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  name!: string;

  @IsNumber({}, { message: 'La latitud de origen debe ser un número.' })
  @Type(() => Number)
  originLat!: number;

  @IsNumber({}, { message: 'La longitud de origen debe ser un número.' })
  @Type(() => Number)
  originLng!: number;

  @IsNumber({}, { message: 'La latitud de destino debe ser un número.' })
  @Type(() => Number)
  destinationLat!: number;

  @IsNumber({}, { message: 'La longitud de destino debe ser un número.' })
  @Type(() => Number)
  destinationLng!: number;

  @IsNumber({}, { message: 'La distancia debe ser un número.' })
  @Min(0, { message: 'La distancia debe ser mayor o igual a 0.' })
  @Type(() => Number)
  distanceKm!: number;

  @IsEnum(VehicleType, { message: 'El tipo de vehículo debe ser LIVIANO, PESADO o CUALQUIERA.' })
  vehicleType!: VehicleType;
}
