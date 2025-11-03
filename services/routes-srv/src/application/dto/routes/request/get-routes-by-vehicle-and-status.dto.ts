import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TripStatus } from '../../../../domain/value-objects/trip-status.vo';

export class GetRoutesByVehicleAndStatusDto {
  @IsNotEmpty({ message: 'El ID del vehículo es obligatorio' })
  @IsNumber({}, { message: 'El ID del vehículo debe ser un número' })
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Aceptar tanto vehicle_id (snake_case) como vehicleId (camelCase)
    return value ?? obj?.vehicle_id ?? obj?.vehicleId;
  })
  vehicleId!: number;

  @IsNotEmpty({ message: 'El estado es obligatorio' })
  @IsString({ message: 'El estado debe ser un string' })
  @Transform(({ value, obj }) => {
    // Aceptar tanto status (camelCase) como viene del proto
    const statusStr = value ?? obj?.status;
    if (!statusStr) return value;
    
    // Convertir string a TripStatus enum
    const upper = typeof statusStr === 'string' ? statusStr.toUpperCase() : statusStr;
    if (upper === 'CREADO' || upper === 'EN_RUTA' || upper === 'EN_REVISION' || upper === 'TERMINADO') {
      return upper as TripStatus;
    }
    return value;
  })
  @IsEnum(TripStatus, { message: 'El estado debe ser CREADO, EN_RUTA, EN_REVISION o TERMINADO' })
  status!: TripStatus;
}

