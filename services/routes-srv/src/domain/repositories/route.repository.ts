// src/domain/repositories/route.repository.ts
import { Route } from '../entities/route.entity';
import { VehicleType } from '../value-objects/vehicle-type.vo';

export interface RouteRepository {
  findById(id: bigint): Promise<Route | null>;
  findAll(vehicleTypeFilter?: VehicleType): Promise<Route[]>;
  create(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint>;
  update(id: bigint, route: Partial<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Route>;
  delete(id: bigint): Promise<void>;
  hasTrips(id: bigint): Promise<boolean>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcludingId(name: string, excludeId: bigint): Promise<boolean>;
}
