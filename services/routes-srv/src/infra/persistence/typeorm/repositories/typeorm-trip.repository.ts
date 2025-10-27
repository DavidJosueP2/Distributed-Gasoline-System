// src/infra/persistence/typeorm/repositories/typeorm-trip.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripRepository } from '../../../domain/repositories/trip.repository';
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/value-objects/trip-status.vo';
import { TripEntity } from '../entities/trip.entity';

@Injectable()
export class TypeOrmTripRepository implements TripRepository {
  constructor(
    @InjectRepository(TripEntity)
    private readonly repository: Repository<TripEntity>,
  ) {}

  async findById(id: bigint): Promise<Trip | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(statusFilter?: TripStatus, driverIdFilter?: bigint): Promise<Trip[]> {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (driverIdFilter) where.driverId = driverIdFilter;
    
    const entities = await this.repository.find({ where });
    return entities.map(entity => this.toDomain(entity));
  }

  async create(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint> {
    const entity = this.toEntity(trip);
    const saved = await this.repository.save(entity);
    return saved.id;
  }

  async update(id: bigint, trip: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Trip> {
    await this.repository.update(id, trip);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) throw new Error('Trip not found after update');
    return this.toDomain(updated);
  }

  async delete(id: bigint): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: TripEntity): Trip {
    return {
      id: entity.id,
      routeId: entity.routeId,
      supervisorId: entity.supervisorId,
      driverId: entity.driverId,
      vehicleId: entity.vehicleId,
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
    entity.routeId = trip.routeId;
    entity.supervisorId = trip.supervisorId;
    entity.driverId = trip.driverId;
    entity.vehicleId = trip.vehicleId;
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
