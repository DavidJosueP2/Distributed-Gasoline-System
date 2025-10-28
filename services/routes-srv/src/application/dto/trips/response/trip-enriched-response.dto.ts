import { TripResponseDto } from './trip-response.dto';
import { VehicleInfoDto, DriverInfoDto, SupervisorInfoDto } from './info-response.dto';

export interface TripEnrichedResponseDto extends TripResponseDto {
  vehicleInfo: VehicleInfoDto;
  driverInfo: DriverInfoDto;
  supervisorInfo: SupervisorInfoDto;
}
