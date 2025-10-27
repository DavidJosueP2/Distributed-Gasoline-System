// src/infra/persistence/typeorm/repositories/typeorm-trip.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripRepository } from 'src/domain/repositories/trip.repository';
import { Trip } from 'src/domain/entities/trip.entity';
import { TripStatus } from 'src/domain/value-objects/trip-status.vo';
import { TripEntity } from '../entities/trip.entity';

@Injectable()
export class TypeOrmTripRepository implements TripRepository {
  constructor(
    @InjectRepository(TripEntity)
    private readonly repository: Repository<TripEntity>,
  ) {}

  async findById(id: bigint): Promise<Trip | null> {
    const entity = await this.repository.findOne({ where: { id: id.toString() } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(statusFilter?: TripStatus, driverIdFilter?: bigint): Promise<Trip[]> {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (driverIdFilter) where.driverId = driverIdFilter.toString();
    
    const entities = await this.repository.find({ where });
    return entities.map(entity => this.toDomain(entity));
  }

  async create(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint> {
    const entity = this.toEntity(trip);
    const saved = await this.repository.save(entity);
    return BigInt(saved.id);
  }

  async update(id: bigint, trip: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip> {
    const updateData: any = { ...trip };
    if (trip.driverId !== undefined) updateData.driverId = trip.driverId.toString();
    if (trip.vehicleId !== undefined) updateData.vehicleId = trip.vehicleId.toString();
    
    await this.repository.update(id.toString(), updateData);
    const updated = await this.repository.findOne({ where: { id: id.toString() } });
    if (!updated) throw new Error('Trip not found after update');
    return this.toDomain(updated);
  }

  async delete(id: bigint): Promise<void> {
    await this.repository.delete(id.toString());
  }

  private toDomain(entity: TripEntity): Trip {
    return {
      id: BigInt(entity.id),
      routeId: BigInt(entity.routeId),
      supervisorId: BigInt(entity.supervisorId),
      driverId: BigInt(entity.driverId),
      vehicleId: BigInt(entity.vehicleId),
      startTime: entity.startTime,
      endTime: entity.endTime,
      status: entity.status as TripStatus,
      odometerStart: Number(entity.odometerStart),
      odometerEnd: entity.odometerEnd ? Number(entity.odometerEnd) : null,
      distanceKmReal: entity.distanceKmReal ? Number(entity.distanceKmReal) : null,
      distanceKmPlanned: Number(entity.distanceKmPlanned),
      fuelEstimated: Number(entity.fuelEstimated),
      fuelActual: entity.fuelActual ? Number(entity.fuelActual) : null,
      reviewComment: entity.reviewComment,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): TripEntity {
    const entity = new TripEntity();
    entity.routeId = trip.routeId.toString();
    entity.supervisorId = trip.supervisorId.toString();
    entity.driverId = trip.driverId.toString();
    entity.vehicleId = trip.vehicleId.toString();
    entity.startTime = trip.startTime;
    entity.endTime = trip.endTime;
    entity.status = trip.status;
    entity.odometerStart = trip.odometerStart;
    entity.odometerEnd = trip.odometerEnd;
    entity.distanceKmReal = trip.distanceKmReal;
    entity.distanceKmPlanned = trip.distanceKmPlanned;
    entity.fuelEstimated = trip.fuelEstimated;
    entity.fuelActual = trip.fuelActual;
    entity.reviewComment = trip.reviewComment;
    return entity;
  }
}
