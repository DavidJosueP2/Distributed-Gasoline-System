// src/domain/entities/route.entity.ts
import { VehicleType } from '../value-objects/vehicle-type.vo';

export interface Route {
  id: bigint;
  name: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  vehicleType: VehicleType;
  createdAt: Date;
  updatedAt: Date;
}
