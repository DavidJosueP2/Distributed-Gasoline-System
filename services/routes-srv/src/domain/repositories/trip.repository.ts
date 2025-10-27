// src/domain/repositories/trip.repository.ts
import { Trip } from '../entities/trip.entity';
import { TripStatus } from '../value-objects/trip-status.vo';

export interface TripRepository {
  findById(id: bigint): Promise<Trip | null>;
  findAll(statusFilter?: TripStatus, driverIdFilter?: bigint): Promise<Trip[]>;
  create(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint>;
  update(id: bigint, trip: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip>;
  delete(id: bigint): Promise<void>;
}
