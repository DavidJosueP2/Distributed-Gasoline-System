import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OperationalStatus } from '../../../domain/value-objects/operational-status';
import {Transform} from "class-transformer";

export class UpdateUnitStatusDto {
  @Transform(({value, obj}) => value ?? obj?.vehicle_id)
  @IsOptional() @IsString()
  vehicleId?: string;

  @IsOptional() @IsString()
  plate?: string;

  @IsEnum(OperationalStatus, { message: 'Estado inválido' })
  newStatus!: OperationalStatus;

  // gRPC envía esta propiedad automáticamente para campos 'oneof'
  // Indica qué campo del oneof está activo (vehicleId o plate)
  @IsOptional() @IsString()
  key?: string;
}
