import { IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RouteDataDto {
  @IsString({ message: 'El nombre de la ruta debe ser una cadena.' })
  name!: string;

  @IsString({ message: 'El nombre del origen debe ser una cadena.' })
  originName!: string;

  @IsNumber({}, { message: 'La latitud del origen debe ser un número.' })
  @Type(() => Number)
  originLat!: number;

  @IsNumber({}, { message: 'La longitud del origen debe ser un número.' })
  @Type(() => Number)
  originLng!: number;

  @IsString({ message: 'El nombre del destino debe ser una cadena.' })
  destinationName!: string;

  @IsNumber({}, { message: 'La latitud del destino debe ser un número.' })
  @Type(() => Number)
  destinationLat!: number;

  @IsNumber({}, { message: 'La longitud del destino debe ser un número.' })
  @Type(() => Number)
  destinationLng!: number;

  @IsNumber({}, { message: 'La distancia debe ser un número.' })
  @Type(() => Number)
  distanceKm!: number;

  @IsNumber({}, { message: 'El tipo de vehículo debe ser un número.' })
  @Type(() => Number)
  vehicleType!: number;
}

export class CreateTripDto {
  @IsOptional()
  @IsNumber({}, { message: 'El ID de la ruta debe ser un número.' })
  @Type(() => Number)
  routeId?: number;

  @IsNotEmpty({ message: 'El ID del supervisor es requerido.' })
  @IsNumber({}, { message: 'El ID del supervisor debe ser un número.' })
  @Type(() => Number)
  supervisorId!: number;

  @IsNotEmpty({ message: 'El ID del conductor es requerido.' })
  @IsNumber({}, { message: 'El ID del conductor debe ser un número.' })
  @Type(() => Number)
  driverId!: number;

  @IsNotEmpty({ message: 'El ID del vehículo es requerido.' })
  @IsNumber({}, { message: 'El ID del vehículo debe ser un número.' })
  @Type(() => Number)
  vehicleId!: number;

  @IsOptional()
  @IsBoolean({ message: 'createRouteIfNotExists debe ser un booleano.' })
  createRouteIfNotExists?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RouteDataDto)
  routeData?: RouteDataDto;
}
