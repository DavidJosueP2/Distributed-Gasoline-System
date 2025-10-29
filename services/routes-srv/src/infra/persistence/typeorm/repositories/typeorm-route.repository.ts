// src/infra/persistence/typeorm/repositories/typeorm-route.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteRepository } from 'src/domain/repositories/route.repository';
import { Route } from 'src/domain/entities/route.entity';
import { VehicleType } from 'src/domain/value-objects/vehicle-type.vo';
import { RouteEntity } from '../entities/route.entity';

@Injectable()
export class TypeOrmRouteRepository implements RouteRepository {
  private readonly logger = new Logger(TypeOrmRouteRepository.name);

  constructor(
    @InjectRepository(RouteEntity)
    private readonly repository: Repository<RouteEntity>,
  ) {}

  async findById(id: bigint): Promise<Route | null> {
    const entity = await this.repository.findOne({ where: { id: id.toString() } });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(vehicleTypeFilter?: VehicleType): Promise<Route[]> {
    this.logger.log(`findAll called with vehicleTypeFilter: ${vehicleTypeFilter}`);
    
    try {
      const where = vehicleTypeFilter ? { vehicleType: vehicleTypeFilter } : {};
      this.logger.log(`Query where clause: ${JSON.stringify(where)}`);
      
      const entities = await this.repository.find({ 
        where,
        order: { createdAt: 'DESC' }
      });
      this.logger.log(`Found ${entities.length} entities in database`);
      
      const routes = entities.map(entity => this.toDomain(entity));
      this.logger.log(`Mapped to ${routes.length} domain routes`);
      
      return routes;
    } catch (error) {
      this.logger.error(`Error in findAll:`, error);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
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

  async hasTrips(id: bigint): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('route')
      .leftJoin('route.trips', 'trip')
      .where('route.id = :id', { id: id.toString() })
      .andWhere('trip.id IS NOT NULL')
      .getCount();
    
    return count > 0;
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await this.repository.count({ where: { name } });
    return count > 0;
  }

  async existsByNameExcludingId(name: string, excludeId: bigint): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('route')
      .where('route.name = :name', { name })
      .andWhere('route.id != :excludeId', { excludeId: excludeId.toString() })
      .getCount();
    
    return count > 0;
  }

  private toDomain(entity: RouteEntity): Route {
    return {
      id: BigInt(entity.id),
      name: entity.name,
      originName: entity.originName,
      originLat: Number(entity.originLat),
      originLng: Number(entity.originLng),
      destinationName: entity.destinationName,
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
    entity.originName = route.originName;
    entity.originLat = route.originLat;
    entity.originLng = route.originLng;
    entity.destinationName = route.destinationName;
    entity.destinationLat = route.destinationLat;
    entity.destinationLng = route.destinationLng;
    entity.distanceKm = route.distanceKm;
    entity.vehicleType = route.vehicleType;
    return entity;
  }
}
