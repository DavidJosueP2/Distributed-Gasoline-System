// src/domain/repositories/trip.repository.ts
import { Trip } from '../entities/trip.entity';
import { TripStatus } from '../value-objects/trip-status.vo';
import { VehicleType } from '../value-objects/vehicle-type.vo';

export interface TripRepository {
  findById(id: bigint): Promise<Trip | null>;
  findAll(
    statusFilter?: TripStatus,
    driverIdFilter?: bigint,
    supervisorIdFilter?: bigint,
  ): Promise<Trip[]>;
  create(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint>;
  update(
    id: bigint,
    trip: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Trip>;
  delete(id: bigint): Promise<void>;
  existsByRouteId(routeId: bigint): Promise<boolean>;
  findActiveTripByDriver(driverId: bigint): Promise<Trip | null>;
  findActiveTripByVehicle(vehicleId: bigint): Promise<Trip | null>;
  countActiveTripsBySupervisor(supervisorId: bigint): Promise<number>;
  countActiveTripsByDriver(driverId: bigint): Promise<number>;
  countEnRutaTripsByDriver(driverId: bigint): Promise<number>;
  countActiveTripsByVehicle(vehicleId: bigint): Promise<number>;
  countCreatedTripsByVehicle(vehicleId: bigint): Promise<number>;
  findAllByVehicleType(vehicleTypeFilter?: VehicleType): Promise<Trip[]>;
  findAllByTimeRange(startTime: Date, endTime: Date): Promise<Trip[]>;
  findAllByVehicleIdAndStatus(
    vehicleId: bigint,
    status: TripStatus,
  ): Promise<Trip[]>;
  // Métodos para verificar existencia de viajes (para validaciones en otros servicios)
  hasTripsBySupervisor(supervisorId: bigint): Promise<boolean>;
  hasTripsByDriver(driverId: bigint): Promise<boolean>;
  hasTripsByVehicle(vehicleId: bigint): Promise<boolean>;
}
