import { Trip } from '../../domain/entities/trip.entity';
import { UserInfo } from '../../infra/clients/users.client';
import { VehicleInfo } from '../../infra/clients/vehicles.client';
import { DriverInfo } from '../../infra/clients/drivers.client';

export interface TripEnriched extends Trip {
  vehicleInfo: VehicleInfo;
  driverInfo: DriverInfo;
  supervisorInfo: UserInfo;
  routeName?: string;
  originName?: string;
  destinationName?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}
