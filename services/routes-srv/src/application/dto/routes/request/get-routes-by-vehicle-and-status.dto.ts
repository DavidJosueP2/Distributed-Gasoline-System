import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TripStatus } from '../../../../domain/value-objects/trip-status.vo';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

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

  @IsOptional()
  @Transform(({ value, obj }) => {
    // Aceptar tanto vehicle_type (snake_case) como vehicleType (camelCase)
    const vehicleTypeValue = value ?? obj?.vehicle_type ?? obj?.vehicleType;
    if (!vehicleTypeValue) return undefined;
    
    // Convertir a string y normalizar a mayúsculas
    if (typeof vehicleTypeValue === 'string') {
      const upper = vehicleTypeValue.toUpperCase();
      if (upper === 'LIVIANO' || upper === 'PESADO' || upper === 'CUALQUIERA') {
        return upper as VehicleType;
      }
    }
    // Si viene como número (del proto enum), convertir a string
    if (typeof vehicleTypeValue === 'number') {
      const enumMap: Record<number, VehicleType> = {
        0: undefined as any, // UNSPECIFIED
        1: VehicleType.LIVIANO,
        2: VehicleType.PESADO,
        3: VehicleType.CUALQUIERA,
      };
      return enumMap[vehicleTypeValue] || undefined;
    }
    return undefined;
  })
  @IsEnum(VehicleType, { message: 'El tipo de vehículo debe ser LIVIANO, PESADO o CUALQUIERA' })
  vehicleType?: VehicleType;
}

