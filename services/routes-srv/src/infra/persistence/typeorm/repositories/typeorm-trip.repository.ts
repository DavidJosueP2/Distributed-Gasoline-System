// src/infra/persistence/typeorm/repositories/typeorm-trip.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TripRepository } from 'src/domain/repositories/trip.repository';
import { Trip } from 'src/domain/entities/trip.entity';
import { TripStatus } from 'src/domain/value-objects/trip-status.vo';
import { VehicleType } from 'src/domain/value-objects/vehicle-type.vo';
import { TripEntity } from '../entities/trip.entity';

@Injectable()
export class TypeOrmTripRepository implements TripRepository {
  private readonly logger = new Logger(TypeOrmTripRepository.name);

  constructor(
    @InjectRepository(TripEntity)
    private readonly repository: Repository<TripEntity>,
  ) {}

  async findById(id: bigint): Promise<Trip | null> {
    const entity = await this.repository.findOne({
      where: { id: id.toString() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(
    statusFilter?: TripStatus,
    driverIdFilter?: bigint,
    supervisorIdFilter?: bigint,
  ): Promise<Trip[]> {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    if (driverIdFilter) where.driverId = driverIdFilter.toString();
    if (supervisorIdFilter) where.supervisorId = supervisorIdFilter.toString();

    // Ordenar por updatedAt DESC (más reciente primero), y si son iguales, por createdAt DESC
    const entities = await this.repository.find({
      where,
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC', // Orden secundario por createdAt si updatedAt es igual
      },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async create(
    trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<bigint> {
    const entity = this.toEntity(trip);
    const saved = await this.repository.save(entity);
    return BigInt(saved.id);
  }

  async update(
    id: bigint,
    trip: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Trip> {
    const updateData: any = { ...trip };
    if (trip.driverId !== undefined)
      updateData.driverId = trip.driverId.toString();
    if (trip.vehicleId !== undefined)
      updateData.vehicleId = trip.vehicleId.toString();

    await this.repository.update(id.toString(), updateData);
    const updated = await this.repository.findOne({
      where: { id: id.toString() },
    });
    if (!updated) throw new Error('Trip not found after update');
    return this.toDomain(updated);
  }

  async delete(id: bigint): Promise<void> {
    await this.repository.delete(id.toString());
  }

  async existsByRouteId(routeId: bigint): Promise<boolean> {
    const count = await this.repository.count({
      where: { routeId: routeId.toString() },
    });
    return count > 0;
  }

  async findActiveTripByDriver(driverId: bigint): Promise<Trip | null> {
    const entity = await this.repository.findOne({
      where: {
        driverId: driverId.toString(),
        status: 'EN_RUTA', // Solo viajes en ruta (activos)
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findActiveTripByVehicle(vehicleId: bigint): Promise<Trip | null> {
    const entity = await this.repository.findOne({
      where: {
        vehicleId: vehicleId.toString(),
        status: 'EN_RUTA', // Solo viajes en ruta (activos)
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async countActiveTripsBySupervisor(supervisorId: bigint): Promise<number> {
    return await this.repository.count({
      where: {
        supervisorId: supervisorId.toString(),
        status: In(['CREADO', 'EN_RUTA', 'EN_REVISION']),
      },
    });
  }

  async countActiveTripsByDriver(driverId: bigint): Promise<number> {
    return await this.repository.count({
      where: {
        driverId: driverId.toString(),
        status: In(['CREADO', 'EN_RUTA', 'EN_REVISION']),
      },
    });
  }

  async countEnRutaTripsByDriver(driverId: bigint): Promise<number> {
    return await this.repository.count({
      where: {
        driverId: driverId.toString(),
        status: 'EN_RUTA',
      },
    });
  }

  async countActiveTripsByVehicle(vehicleId: bigint): Promise<number> {
    return await this.repository.count({
      where: {
        vehicleId: vehicleId.toString(),
        status: In(['CREADO', 'EN_RUTA', 'EN_REVISION']),
      },
    });
  }

  async countCreatedTripsByVehicle(vehicleId: bigint): Promise<number> {
    return await this.repository.count({
      where: {
        vehicleId: vehicleId.toString(),
        status: 'CREADO',
      },
    });
  }

  async findAllByVehicleType(vehicleTypeFilter?: VehicleType): Promise<Trip[]> {
    this.logger.log(
      `findAllByVehicleType called with filter: ${vehicleTypeFilter || 'NONE'}`,
    );

    const queryBuilder = this.repository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.route', 'route')
      .where('trip.status = :status', { status: 'TERMINADO' });

    if (vehicleTypeFilter) {
      // TypeORM usa el nombre del campo de la entidad en camelCase
      queryBuilder.andWhere('route.vehicleType = :vehicleType', {
        vehicleType: vehicleTypeFilter,
      });
      this.logger.log(
        `Query filter applied: route.vehicleType = ${vehicleTypeFilter}`,
      );
    } else {
      this.logger.log(
        'No vehicle type filter, but filtering by TERMINADO status',
      );
    }

    const sql = queryBuilder.getSql();
    const params = queryBuilder.getParameters();
    this.logger.log(`Generated SQL: ${sql}`);
    this.logger.log(`Query parameters: ${JSON.stringify(params)}`);

    // Ordenar por updatedAt DESC
    queryBuilder.orderBy('trip.updatedAt', 'DESC');
    queryBuilder.addOrderBy('trip.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();
    this.logger.log(`Found ${entities.length} trips`);

    // Log de debug: verificar que las rutas tienen el tipo correcto y los estados
    if (entities.length > 0) {
      const statusCount: Record<string, number> = {};
      entities.forEach((entity) => {
        const status = entity.status || 'UNKNOWN';
        statusCount[status] = (statusCount[status] || 0) + 1;
        if ((entity as any).route) {
          // Log de los primeros 3 para debug
          if (entities.indexOf(entity) < 3) {
            this.logger.log(
              `Trip ${entities.indexOf(entity)}: status=${entity.status}, route.vehicleType = ${(entity as any).route.vehicleType}`,
            );
          }
        }
      });
      this.logger.log(`Trips by status: ${JSON.stringify(statusCount)}`);
    }

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAllByTimeRange(startTime: Date, endTime: Date): Promise<Trip[]> {
    // Buscar viajes que intersectan con el rango de tiempo
    // Un viaje intersecta si: start_time <= endTime AND (end_time >= startTime OR end_time IS NULL)
    const entities = await this.repository
      .createQueryBuilder('trip')
      .where('trip.startTime IS NOT NULL')
      .andWhere('trip.startTime <= :endTime', { endTime })
      .andWhere('(trip.endTime >= :startTime OR trip.endTime IS NULL)', {
        startTime,
      })
      .orderBy('trip.updatedAt', 'DESC')
      .addOrderBy('trip.createdAt', 'DESC')
      .getMany();

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAllByVehicleIdAndStatus(
    vehicleId: bigint,
    status: TripStatus,
  ): Promise<Trip[]> {
    this.logger.log(
      `findAllByVehicleIdAndStatus called with vehicleId: ${vehicleId}, status: ${status}`,
    );

    const entities = await this.repository.find({
      where: {
        vehicleId: vehicleId.toString(),
        status: status,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    this.logger.log(
      `Found ${entities.length} trips for vehicle ${vehicleId} with status ${status}`,
    );

    return entities.map((entity) => this.toDomain(entity));
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
      distanceKmReal: entity.distanceKmReal
        ? Number(entity.distanceKmReal)
        : null,
      distanceKmPlanned: Number(entity.distanceKmPlanned),
      fuelEstimated: Number(entity.fuelEstimated),
      fuelActual: entity.fuelActual ? Number(entity.fuelActual) : null,
      reviewComment: entity.reviewComment,
      currentLat: entity.currentLat ? Number(entity.currentLat) : null,
      currentLng: entity.currentLng ? Number(entity.currentLng) : null,
      currentDistance: entity.currentDistance
        ? Number(entity.currentDistance)
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toEntity(
    trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>,
  ): TripEntity {
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
    entity.currentLat = trip.currentLat ?? null;
    entity.currentLng = trip.currentLng ?? null;
    entity.currentDistance = trip.currentDistance ?? null;
    return entity;
  }
}
