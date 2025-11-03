// src/application/services/route.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../tokens';
import { RouteRepository } from '../../domain/repositories/route.repository';
import { TripRepository } from '../../domain/repositories/trip.repository';
import { Route } from '../../domain/entities/route.entity';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';
import { TripStatus } from '../../domain/value-objects/trip-status.vo';
import { TripEnriched } from '../interfaces/trip-enriched.interface';
import { VehiclesClient } from '../../infra/clients/vehicles.client';
import { DriversClient } from '../../infra/clients/drivers.client';
import { UsersClient } from '../../infra/clients/users.client';
import { GrpcClientFactory } from '../../infra/grpc/grpc-client.factory';
import { 
  NotFoundException, 
  InvalidDistanceException,
  InvalidIdentifierException,
  RouteHasTripsException
} from '../exceptions';
import { RouteNameAlreadyExistsException } from '../exceptions/route-name-already-exists.exception';

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(
    @Inject(TOKENS.RouteRepository)
    private readonly routeRepo: RouteRepository,
    @Inject(TOKENS.TripRepository)
    private readonly tripRepo: TripRepository,
    private readonly grpcClientFactory: GrpcClientFactory,
  ) {}

  private async vehiclesClient(): Promise<VehiclesClient> {
    const client = await this.grpcClientFactory.clientFor(
      'VEHICLES-SERVICE',
      'vehicles.v1',
      'vehicles.proto',
    );
    return new VehiclesClient(client);
  }

  private async driversClient(): Promise<DriversClient> {
    const client = await this.grpcClientFactory.clientFor(
      'DRIVER-SERVICE',
      'driverms.v1',
      'driver_ms.proto',
    );
    return new DriversClient(client);
  }

  private async usersClient(): Promise<UsersClient> {
    const client = await this.grpcClientFactory.clientFor(
      'USERS-SERVICE',
      'users',
      'users.proto',
    );
    return new UsersClient(client);
  }

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
  }): Promise<Route> {
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

    // Validar que el nombre sea único
    const trimmedName = input.name.trim();
    const nameExists = await this.routeRepo.existsByName(trimmedName);
    if (nameExists) {
      throw new RouteNameAlreadyExistsException(trimmedName);
    }

    const route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'> = {
      name: trimmedName,
      originName: input.originName.trim(),
      originLat: input.originLat,
      originLng: input.originLng,
      destinationName: input.destinationName.trim(),
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      distanceKm: input.distanceKm,
      vehicleType: input.vehicleType,
    };

    const routeId = await this.routeRepo.create(route);
    return await this.routeRepo.findById(routeId);
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
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      // Validar que el nuevo nombre sea único (excluyendo la ruta actual)
      const nameExists = await this.routeRepo.existsByNameExcludingId(trimmedName, id);
      if (nameExists) {
        throw new RouteNameAlreadyExistsException(trimmedName);
      }
      updateData.name = trimmedName;
    }
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
      throw new RouteHasTripsException(existingRoute.name);
    }

    await this.routeRepo.delete(id);
  }

  async getRoutesByVehicleAndStatus(vehicleId: bigint, status: TripStatus, vehicleType?: VehicleType): Promise<Array<{ route: Route; trips: TripEnriched[] }>> {
    this.logger.log(`getRoutesByVehicleAndStatus called with vehicleId: ${vehicleId}, status: ${status}, vehicleType: ${vehicleType}`);
    
    // Obtener todos los viajes con ese vehículo y estado
    const trips = await this.tripRepo.findAllByVehicleIdAndStatus(vehicleId, status);
    this.logger.log(`Found ${trips.length} trips for vehicle ${vehicleId} with status ${status}`);
    
    if (trips.length === 0) {
      return [];
    }
    
    // Obtener todos los clientes una vez para enriquecer los viajes
    const [vehiclesClient, driversClient, usersClient] = await Promise.all([
      this.vehiclesClient(),
      this.driversClient(),
      this.usersClient()
    ]);
    
    // Enriquecer todos los viajes
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        const [route, vehicleInfo, driverInfo, supervisorInfo] = await Promise.all([
          this.routeRepo.findById(trip.routeId),
          vehiclesClient.getVehicleInfo(trip.vehicleId),
          driversClient.getDriverInfo(trip.driverId, usersClient),
          usersClient.getUserInfo(trip.supervisorId)
        ]);

        return {
          ...trip,
          vehicleInfo,
          driverInfo,
          supervisorInfo,
          routeName: route?.name,
          originName: route?.originName,
          destinationName: route?.destinationName
        } as TripEnriched;
      })
    );
    
    // Agrupar viajes enriquecidos por route_id
    const tripsByRouteId = new Map<bigint, TripEnriched[]>();
    for (const trip of enrichedTrips) {
      const routeId = trip.routeId;
      if (!tripsByRouteId.has(routeId)) {
        tripsByRouteId.set(routeId, []);
      }
      tripsByRouteId.get(routeId)!.push(trip);
    }
    
    this.logger.log(`Trips grouped into ${tripsByRouteId.size} unique routes`);
    
    // Obtener las rutas y construir la respuesta
    const routesWithTrips = await Promise.all(
      Array.from(tripsByRouteId.entries()).map(async ([routeId, routeTrips]) => {
        const route = await this.routeRepo.findById(routeId);
        if (!route) {
          this.logger.warn(`Route ${routeId} not found for trip`);
          return null;
        }
        
        return {
          route,
          trips: routeTrips
        };
      })
    );
    
    // Filtrar los nulls
    let validRoutes = routesWithTrips.filter(r => r !== null) as Array<{ route: Route; trips: TripEnriched[] }>;
    
    // Filtrar por vehicleType si se proporciona (CUALQUIERA no aplica filtro)
    if (vehicleType && vehicleType !== VehicleType.CUALQUIERA) {
      validRoutes = validRoutes.filter(r => r.route.vehicleType === vehicleType);
      this.logger.log(`Filtered to ${validRoutes.length} routes with vehicleType ${vehicleType}`);
    }
    
    // Ordenar por fecha de creación de la ruta (más reciente primero)
    validRoutes.sort((a, b) => b.route.createdAt.getTime() - a.route.createdAt.getTime());
    
    this.logger.log(`Returning ${validRoutes.length} routes with enriched trips`);
    
    return validRoutes;
  }
}
