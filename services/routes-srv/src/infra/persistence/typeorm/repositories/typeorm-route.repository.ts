// src/infra/persistence/typeorm/repositories/typeorm-route.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteRepository } from 'src/domain/repositories/route.repository';
import { Route } from 'src/domain/entities/route.entity';
import { VehicleType } from 'src/domain/value-objects/vehicle-type.vo';
import { RouteEntity } from '../entities/route.entity';

@Injectable()
export class TypeOrmRouteRepository implements RouteRepository {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly repository: Repository<RouteEntity>,
  ) {}

  async findById(id: bigint): Promise<Route | null> {
    const entity = await this.repository.findOne({ where: { id: id.toString() } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(vehicleTypeFilter?: VehicleType): Promise<Route[]> {
    const where = vehicleTypeFilter ? { vehicleType: vehicleTypeFilter } : {};
    const entities = await this.repository.find({ where });
    return entities.map(entity => this.toDomain(entity));
  }

  async create(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint> {
    const entity = this.toEntity(route);
    const saved = await this.repository.save(entity);
    return BigInt(saved.id);
  }

  async update(id: bigint, route: Partial<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Route> {
    await this.repository.update(id.toString(), route);
    const updated = await this.repository.findOne({ where: { id: id.toString() } });
    if (!updated) throw new Error('Route not found after update');
    return this.toDomain(updated);
  }

  async delete(id: bigint): Promise<void> {
    await this.repository.delete(id.toString());
  }

  private toDomain(entity: RouteEntity): Route {
    return {
      id: BigInt(entity.id),
      name: entity.name,
      originLat: Number(entity.originLat),
      originLng: Number(entity.originLng),
      destinationLat: Number(entity.destinationLat),
      destinationLng: Number(entity.destinationLng),
      distanceKm: Number(entity.distanceKm),
      vehicleType: entity.vehicleType as VehicleType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): RouteEntity {
    const entity = new RouteEntity();
    entity.name = route.name;
    entity.originLat = route.originLat;
    entity.originLng = route.originLng;
    entity.destinationLat = route.destinationLat;
    entity.destinationLng = route.destinationLng;
    entity.distanceKm = route.distanceKm;
    entity.vehicleType = route.vehicleType;
    return entity;
  }
}
