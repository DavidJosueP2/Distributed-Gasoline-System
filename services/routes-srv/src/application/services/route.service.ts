// src/application/services/route.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../tokens';
import { RouteRepository } from '../../domain/repositories/route.repository';
import { TripRepository } from '../../domain/repositories/trip.repository';
import { Route } from '../../domain/entities/route.entity';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';
import { 
  NotFoundException, 
  InvalidDistanceException,
  InvalidIdentifierException,
  RouteHasTripsException
} from '../exceptions';

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(
    @Inject(TOKENS.RouteRepository)
    private readonly routeRepo: RouteRepository,
    @Inject(TOKENS.TripRepository)
    private readonly tripRepo: TripRepository,
  ) {}

  async createRoute(input: {
    name: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
  }): Promise<bigint> {
    // Validaciones básicas
    if (!input.name?.trim()) {
      throw new InvalidIdentifierException('El nombre de la ruta es obligatorio');
    }

    if (!input.originName?.trim()) {
      throw new InvalidIdentifierException('El nombre de origen es obligatorio');
    }

    if (!input.destinationName?.trim()) {
      throw new InvalidIdentifierException('El nombre de destino es obligatorio');
    }

    if (input.distanceKm <= 0) {
      throw new InvalidDistanceException(input.distanceKm);
    }

    const route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'> = {
      name: input.name.trim(),
      originName: input.originName.trim(),
      originLat: input.originLat,
      originLng: input.originLng,
      destinationName: input.destinationName.trim(),
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      distanceKm: input.distanceKm,
      vehicleType: input.vehicleType,
    };

    return await this.routeRepo.create(route);
  }

  async getRoute(id: bigint): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }
    return route;
  }

  async hasTrips(id: bigint): Promise<boolean> {
    return await this.routeRepo.hasTrips(id);
  }

  async listRoutes(vehicleTypeFilter?: VehicleType): Promise<Route[]> {
    this.logger.log(`listRoutes called with vehicleTypeFilter: ${vehicleTypeFilter}`);
    
    try {
      const routes = await this.routeRepo.findAll(vehicleTypeFilter);
      this.logger.log(`Found ${routes.length} routes in database`);
      return routes;
    } catch (error) {
      this.logger.error(`Error in listRoutes:`, error);
      this.logger.error(`Error stack:`, error.stack);
      throw error;
    }
  }

  async updateRoute(id: bigint, input: Partial<{
    name: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
  }>): Promise<Route> {
    const existingRoute = await this.routeRepo.findById(id);
    if (!existingRoute) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // Verificar si la ruta tiene viajes asociados
    const hasTrips = await this.routeRepo.hasTrips(id);
    
    const updateData: Partial<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>> = {};
    
    // Campos que siempre se pueden actualizar
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.originName !== undefined) updateData.originName = input.originName.trim();
    if (input.destinationName !== undefined) updateData.destinationName = input.destinationName.trim();
    
    // Campos que solo se pueden actualizar si NO hay viajes asociados
    if (hasTrips) {
      // Si hay viajes, solo permitir actualizar campos de texto
      this.logger.log(`Route ${id} has trips, only allowing name/origin/destination updates`);
    } else {
      // Si no hay viajes, permitir actualizar todos los campos
      this.logger.log(`Route ${id} has no trips, allowing full update`);
      if (input.originLat !== undefined) updateData.originLat = input.originLat;
      if (input.originLng !== undefined) updateData.originLng = input.originLng;
      if (input.destinationLat !== undefined) updateData.destinationLat = input.destinationLat;
      if (input.destinationLng !== undefined) updateData.destinationLng = input.destinationLng;
      if (input.distanceKm !== undefined) updateData.distanceKm = input.distanceKm;
      if (input.vehicleType !== undefined) updateData.vehicleType = input.vehicleType;
    }

    return await this.routeRepo.update(id, updateData);
  }

  async deleteRoute(id: bigint): Promise<void> {
    const existingRoute = await this.routeRepo.findById(id);
    if (!existingRoute) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // Verificar si la ruta tiene viajes relacionados
    const hasTrips = await this.tripRepo.existsByRouteId(id);
    if (hasTrips) {
      throw new RouteHasTripsException(id);
    }

    await this.routeRepo.delete(id);
  }
}
