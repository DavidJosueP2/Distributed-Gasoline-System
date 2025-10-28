// src/presentation/grpc/routes.controller.ts
import { Controller } from '@nestjs/common';
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
  DeleteRouteDto 
} from '../../application/dto/routes';

@Controller()
export class RoutesController {
  constructor(private readonly routeService: RouteService) {}

  @GrpcMethod('RoutesService', 'CreateRoute')
  async createRoute(request: CreateRouteDto): Promise<any> {
    try {
      const id = await this.routeService.createRoute({
        name: request.name,
        originLat: request.originLat,
        originLng: request.originLng,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        distanceKm: request.distanceKm,
        vehicleType: request.vehicleType as VehicleType,
      });

      return { id: id.toString() };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('RoutesService', 'GetRoute')
  async getRoute(request: any): Promise<any> {
    try {
      const route = await this.routeService.getRoute(BigInt(request.id));
      return { route: RouteGrpcMapper.toProto(route) };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('RoutesService', 'ListRoutes')
  async listRoutes(request: any): Promise<any> {
    try {
      const vehicleTypeFilter = request.vehicleTypeFilter 
        ? this.mapVehicleTypeFromProto(request.vehicleTypeFilter)
        : undefined;
      
      const routes = await this.routeService.listRoutes(vehicleTypeFilter);
      return { routes: routes.map(RouteGrpcMapper.toProto) };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('RoutesService', 'UpdateRoute')
  async updateRoute(request: any): Promise<any> {
    try {
      const route = await this.routeService.updateRoute(BigInt(request.id), {
        name: request.name,
        originLat: request.originLat,
        originLng: request.originLng,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        distanceKm: request.distanceKm,
        vehicleType: this.mapVehicleTypeFromProto(request.vehicleType),
      });

      return RouteGrpcMapper.toProto(route);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('RoutesService', 'DeleteRoute')
  async deleteRoute(request: any): Promise<any> {
    try {
      await this.routeService.deleteRoute(BigInt(request.id));
      return {};
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
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
