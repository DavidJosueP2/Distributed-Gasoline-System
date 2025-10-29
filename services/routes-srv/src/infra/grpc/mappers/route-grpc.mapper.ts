// src/infra/grpc/mappers/route-grpc.mapper.ts
import { Route } from '../../../domain/entities/route.entity';
import { VehicleType } from '../../../domain/value-objects/vehicle-type.vo';
import { RouteListItemDto } from '../../../application/dto/routes/response/route-list-item.dto';

export class RouteGrpcMapper {
  static toProto(route: Route, hasTrips: boolean = false): any {
    return {
      id: route.id.toString(),
      name: route.name,
      originName: route.originName,
      originLat: route.originLat,
      originLng: route.originLng,
      destinationName: route.destinationName,
      destinationLat: route.destinationLat,
      destinationLng: route.destinationLng,
      distanceKm: route.distanceKm,
      vehicleType: RouteGrpcMapper.mapVehicleTypeToProto(route.vehicleType),
      hasTrips: hasTrips,
      createdAt: RouteGrpcMapper.mapDateToTimestamp(route.createdAt),
      updatedAt: RouteGrpcMapper.mapDateToTimestamp(route.updatedAt),
    };
  }

  static fromProto(proto: any): Route {
    return {
      id: BigInt(proto.id),
      name: proto.name,
      originName: proto.originName,
      originLat: proto.originLat,
      originLng: proto.originLng,
      destinationName: proto.destinationName,
      destinationLat: proto.destinationLat,
      destinationLng: proto.destinationLng,
      distanceKm: proto.distanceKm,
      vehicleType: RouteGrpcMapper.mapVehicleTypeFromProto(proto.vehicleType),
      createdAt: RouteGrpcMapper.mapTimestampToDate(proto.createdAt),
      updatedAt: RouteGrpcMapper.mapTimestampToDate(proto.updatedAt),
    };
  }

  private static mapVehicleTypeToProto(vehicleType: VehicleType): number {
    switch (vehicleType) {
      case VehicleType.LIVIANO:
        return 1; // LIVIANO
      case VehicleType.PESADO:
        return 2; // PESADO
      case VehicleType.CUALQUIERA:
        return 3; // CUALQUIERA
      default:
        return 0; // UNSPECIFIED
    }
  }

  private static mapVehicleTypeFromProto(protoType: string): VehicleType {
    // Normalizar a mayúsculas y mapear
    const normalizedType = protoType.toUpperCase();
    
    switch (normalizedType) {
      case 'LIVIANO':
        return VehicleType.LIVIANO;
      case 'PESADO':
        return VehicleType.PESADO;
      case 'CUALQUIERA':
        return VehicleType.CUALQUIERA;
      default:
        throw new Error(`Invalid vehicle type: ${protoType}`);
    }
  }

  private static mapDateToTimestamp(date: Date): any {
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanos: (date.getTime() % 1000) * 1e6,
    };
  }

  private static mapTimestampToDate(timestamp: any): Date {
    return new Date(timestamp.seconds * 1000 + timestamp.nanos / 1e6);
  }

  // Método específico para listado (sin coordenadas)
  static toListItemProto(route: Route): any {
    return {
      id: route.id.toString(),
      name: route.name,
      originName: route.originName,
      destinationName: route.destinationName,
      distanceKm: route.distanceKm,
      vehicleType: RouteGrpcMapper.mapVehicleTypeToProto(route.vehicleType),
      createdAt: RouteGrpcMapper.mapDateToTimestamp(route.createdAt),
      updatedAt: RouteGrpcMapper.mapDateToTimestamp(route.updatedAt),
    };
  }
}
