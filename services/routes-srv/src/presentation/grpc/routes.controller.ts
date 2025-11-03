// src/presentation/grpc/routes.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { RouteService } from '../../application/services/route.service';
import { RouteGrpcMapper } from '../../infra/grpc/mappers/route-grpc.mapper';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { 
  CreateRouteDto, 
  UpdateRouteDto, 
  GetRouteDto, 
  ListRoutesDto, 
  GetRoutesByVehicleAndStatusDto,
  DeleteRouteDto 
} from '../../application/dto/routes';
import { TripGrpcMapper } from '../../infra/grpc/mappers/trip-grpc.mapper';

@Controller()
export class RoutesController {
  private readonly logger = new Logger(RoutesController.name);

  constructor(private readonly routeService: RouteService) {}

  @GrpcMethod('RoutesService', 'CreateRoute')
  async createRoute(request: CreateRouteDto): Promise<any> {
    this.logger.log(`CreateRoute called with request: ${JSON.stringify(request)}`);
    
    try {
        const route = await this.routeService.createRoute({
          name: request.name,
          originName: request.originName,
          originLat: request.originLat,
          originLng: request.originLng,
          destinationName: request.destinationName,
          destinationLat: request.destinationLat,
          destinationLng: request.destinationLng,
          distanceKm: request.distanceKm,
          vehicleType: request.vehicleType as VehicleType,
        });

      this.logger.log(`Route created: ${route.name} (${route.originName} -> ${route.destinationName})`);
      return RouteGrpcMapper.toProto(route, false); // hasTrips siempre será false para rutas recién creadas
    } catch (error) {
      this.logger.error(`Error in CreateRoute:`, error);
      this.logger.error(`Error stack:`, error.stack);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'GetRoute')
  async getRoute(request: any): Promise<any> {
    this.logger.log(`GetRoute called with ID: ${request.id}`);
    
    try {
      const route = await this.routeService.getRoute(BigInt(request.id));
      const hasTrips = await this.routeService.hasTrips(BigInt(request.id));
      this.logger.log(`Route found: ${route.name} (${route.originName} -> ${route.destinationName}), hasTrips: ${hasTrips}`);
      return { route: RouteGrpcMapper.toProto(route, hasTrips) };
    } catch (error) {
      this.logger.error(`Error in GetRoute:`, error);
      this.logger.error(`Error stack:`, error.stack);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'ListRoutes')
  async listRoutes(request: ListRoutesDto): Promise<any> {
    this.logger.log(`ListRoutes called with request: ${JSON.stringify(request)}`);
    
    try {
      this.logger.log(`Vehicle type filter: ${request.vehicleTypeFilter}`);
      
      const routes = await this.routeService.listRoutes(request.vehicleTypeFilter);
      this.logger.log(`Found ${routes.length} routes`);
      
      return { routes: routes.map(RouteGrpcMapper.toListItemProto) };
    } catch (error) {
      this.logger.error(`Error in ListRoutes:`, error);
      this.logger.error(`Error stack:`, error.stack);
      this.logger.error(`Error message:`, error.message);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      this.logger.error(`Unknown error type: ${typeof error}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'UpdateRoute')
  async updateRoute(request: any): Promise<any> {
    this.logger.log(`UpdateRoute called with ID: ${request.id}`);
    
    try {
        const route = await this.routeService.updateRoute(BigInt(request.id), {
          name: request.name,
          originName: request.originName,
          originLat: request.originLat,
          originLng: request.originLng,
          destinationName: request.destinationName,
          destinationLat: request.destinationLat,
          destinationLng: request.destinationLng,
          distanceKm: request.distanceKm,
          vehicleType: request.vehicleType as VehicleType,
        });

      this.logger.log(`Route updated: ${route.name} (${route.originName} -> ${route.destinationName})`);
      const hasTrips = await this.routeService.hasTrips(BigInt(request.id));
      return RouteGrpcMapper.toProto(route, hasTrips);
    } catch (error) {
      this.logger.error(`Error in UpdateRoute:`, error);
      this.logger.error(`Error stack:`, error.stack);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'DeleteRoute')
  async deleteRoute(request: any): Promise<any> {
    this.logger.log(`DeleteRoute called with ID: ${request.id}`);
    
    try {
      await this.routeService.deleteRoute(BigInt(request.id));
      this.logger.log(`Route deleted successfully: ${request.id}`);
      return { success: true, message: 'Ruta eliminada exitosamente' };
    } catch (error) {
      this.logger.error(`Error in DeleteRoute:`, error);
      this.logger.error(`Error stack:`, error.stack);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'GetRoutesByVehicleAndStatus')
  async getRoutesByVehicleAndStatus(request: GetRoutesByVehicleAndStatusDto): Promise<any> {
    this.logger.log(`GetRoutesByVehicleAndStatus called with request: ${JSON.stringify(request)}`);
    
    try {
      const routesWithTrips = await this.routeService.getRoutesByVehicleAndStatus(
        BigInt(request.vehicleId),
        request.status
      );
      
      this.logger.log(`Found ${routesWithTrips.length} routes with trips`);
      
      // Calcular totales
      const totalTrips = routesWithTrips.reduce((sum, item) => sum + item.trips.length, 0);
      
      // Mapear a la estructura del proto usando el mapper enriquecido
      const response = {
        routes: routesWithTrips.map(({ route, trips }) => {
          const hasTrips = trips.length > 0;
          return {
            route: RouteGrpcMapper.toProto(route, hasTrips),
            trips: trips.map(trip => TripGrpcMapper.toProtoEnriched(trip))
          };
        }),
        totalRoutes: routesWithTrips.length,
        totalTrips: totalTrips
      };
      
      return response;
    } catch (error) {
      this.logger.error(`Error in GetRoutesByVehicleAndStatus:`, error);
      this.logger.error(`Error stack:`, error.stack);
      
      if (error instanceof RpcException) {
        this.logger.error(`RpcException thrown:`, error.getError());
        throw error;
      }
      
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${error.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('RoutesService', 'AssignVehicleToRoute')
  async assignVehicleToRoute(request: any): Promise<any> {
    // TODO: Implementar lógica de asignación
    return { success: true, message: 'Asignación realizada correctamente' };
  }

  private mapVehicleTypeFromProto(protoType: number): VehicleType {
    switch (protoType) {
      case 1:
        return VehicleType.LIVIANO;
      case 2:
        return VehicleType.PESADO;
      case 3:
        return VehicleType.CUALQUIERA;
      default:
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: `Tipo de vehículo inválido: ${protoType}`,
        });
    }
  }
}
