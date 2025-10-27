// src/application/services/route.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../tokens';
import { RouteRepository } from '../../domain/repositories/route.repository';
import { Route } from '../../domain/entities/route.entity';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';
import { 
  NotFoundException, 
  InvalidDistanceException,
  InvalidIdentifierException 
} from '../exceptions';

@Injectable()
export class RouteService {
  constructor(
    @Inject(TOKENS.RouteRepository)
    private readonly routeRepo: RouteRepository,
  ) {}

  async createRoute(input: {
    name: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
  }): Promise<bigint> {
    // Validaciones básicas
    if (!input.name?.trim()) {
      throw new InvalidIdentifierException('El nombre de la ruta es obligatorio');
    }

    if (input.distanceKm <= 0) {
      throw new InvalidDistanceException(input.distanceKm);
    }

    const route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'> = {
      name: input.name.trim(),
      originLat: input.originLat,
      originLng: input.originLng,
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

  async listRoutes(vehicleTypeFilter?: VehicleType): Promise<Route[]> {
    return await this.routeRepo.findAll(vehicleTypeFilter);
  }

  async updateRoute(id: bigint, input: Partial<{
    name: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    distanceKm: number;
    vehicleType: VehicleType;
  }>): Promise<Route> {
    const existingRoute = await this.routeRepo.findById(id);
    if (!existingRoute) {
      throw new NotFoundException('Ruta no encontrada');
    }

    const updateData: Partial<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>> = {};
    
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.originLat !== undefined) updateData.originLat = input.originLat;
    if (input.originLng !== undefined) updateData.originLng = input.originLng;
    if (input.destinationLat !== undefined) updateData.destinationLat = input.destinationLat;
    if (input.destinationLng !== undefined) updateData.destinationLng = input.destinationLng;
    if (input.distanceKm !== undefined) updateData.distanceKm = input.distanceKm;
    if (input.vehicleType !== undefined) updateData.vehicleType = input.vehicleType;

    return await this.routeRepo.update(id, updateData);
  }

  async deleteRoute(id: bigint): Promise<void> {
    const existingRoute = await this.routeRepo.findById(id);
    if (!existingRoute) {
      throw new NotFoundException('Ruta no encontrada');
    }

    await this.routeRepo.delete(id);
  }
}
