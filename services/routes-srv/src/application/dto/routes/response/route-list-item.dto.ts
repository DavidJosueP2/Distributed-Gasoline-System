import { VehicleType } from '../../../../domain/value-objects/vehicle-type.vo';

export class RouteListItemDto {
  id: string;
  name: string;
  originName: string;
  destinationName: string;
  distanceKm: number;
  vehicleType: VehicleType;
  createdAt: Date;
  updatedAt: Date;
}
