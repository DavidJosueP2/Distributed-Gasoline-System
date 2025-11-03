import { IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class ListTripsByVehicleTypeDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Si viene como número (enum del proto), convertir a VehicleType
    if (typeof value === 'number') {
      switch (value) {
        case 0:
          return undefined; // UNSPECIFIED = todos
        case 1:
          return VehicleType.LIVIANO;
        case 2:
          return VehicleType.PESADO;
        case 3:
          return VehicleType.CUALQUIERA;
        default:
          return undefined;
      }
    }
    // Si viene como string, convertir a mayúsculas y validar (como en ListRoutesDto)
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  @IsEnum(VehicleType, { message: 'El tipo de vehículo debe ser LIVIANO, PESADO o CUALQUIERA.' })
  vehicleTypeFilter?: VehicleType;
}

