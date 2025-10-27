// src/infra/grpc/mappers/route-grpc.mapper.ts
import { Route } from '../../../domain/entities/route.entity';
import { VehicleType } from '../../../domain/value-objects/vehicle-type.vo';

export class RouteGrpcMapper {
  static toProto(route: Route): any {
    return {
      id: route.id.toString(),
      name: route.name,
      originLat: route.originLat,
      originLng: route.originLng,
      destinationLat: route.destinationLat,
      destinationLng: route.destinationLng,
      distanceKm: route.distanceKm,
      vehicleType: this.mapVehicleTypeToProto(route.vehicleType),
      createdAt: this.mapDateToTimestamp(route.createdAt),
      updatedAt: this.mapDateToTimestamp(route.updatedAt),
    };
  }

  static fromProto(proto: any): Route {
    return {
      id: BigInt(proto.id),
      name: proto.name,
      originLat: proto.originLat,
      originLng: proto.originLng,
      destinationLat: proto.destinationLat,
      destinationLng: proto.destinationLng,
      distanceKm: proto.distanceKm,
      vehicleType: this.mapVehicleTypeFromProto(proto.vehicleType),
      createdAt: this.mapTimestampToDate(proto.createdAt),
      updatedAt: this.mapTimestampToDate(proto.updatedAt),
    };
  }

  private static mapVehicleTypeToProto(vehicleType: VehicleType): number {
    switch (vehicleType) {
      case VehicleType.LIVIANO:
        return 1; // LIVIANO
      case VehicleType.PESADO:
        return 2; // PESADO
      default:
        return 0; // UNSPECIFIED
    }
  }

  private static mapVehicleTypeFromProto(protoType: number): VehicleType {
    switch (protoType) {
      case 1:
        return VehicleType.LIVIANO;
      case 2:
        return VehicleType.PESADO;
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
}
