import { IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../../../domain/value-objects/trip-status.vo';

export class ListTripsDto {
  @IsOptional()
  @IsEnum(TripStatus, { message: 'El estado debe ser CREADO, EN_RUTA, EN_REVISION o TERMINADO.' })
  statusFilter?: TripStatus;

  @IsOptional()
  @IsNumber({}, { message: 'El ID del conductor debe ser un número.' })
  @Type(() => Number)
  driverIdFilter?: number;
}
