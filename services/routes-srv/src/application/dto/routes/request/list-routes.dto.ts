import { IsOptional, IsEnum } from 'class-validator';
import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class ListRoutesDto {
  @IsOptional()
  @IsEnum(VehicleType, { message: 'El tipo de vehículo debe ser LIVIANO, PESADO o CUALQUIERA.' })
  vehicleTypeFilter?: VehicleType;
}
