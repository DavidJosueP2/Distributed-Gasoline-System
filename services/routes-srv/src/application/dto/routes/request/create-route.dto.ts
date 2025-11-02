import { IsNotEmpty, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class CreateRouteDto {
  @IsString({ message: 'El nombre de la ruta debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de la ruta es obligatorio.' })
  name!: string;

  @IsString({ message: 'El nombre de origen debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de origen es obligatorio.' })
  originName!: string;

  @IsNumber({}, { message: 'La latitud de origen debe ser un número.' })
  @Type(() => Number)
  originLat!: number;

  @IsNumber({}, { message: 'La longitud de origen debe ser un número.' })
  @Type(() => Number)
  originLng!: number;

  @IsString({ message: 'El nombre de destino debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de destino es obligatorio.' })
  destinationName!: string;

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
