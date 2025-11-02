// src/infra/grpc/mappers/trip-grpc.mapper.ts
import { Trip } from '../../../domain/entities/trip.entity';
import { TripStatus } from '../../../domain/value-objects/trip-status.vo';
import { TripEnriched } from '../../../application/interfaces/trip-enriched.interface';

export class TripGrpcMapper {
  static toProto(trip: Trip): any {
    return {
      id: trip.id.toString(),
      routeId: trip.routeId.toString(),
      supervisorId: trip.supervisorId.toString(),
      driverId: trip.driverId.toString(),
      vehicleId: trip.vehicleId.toString(),
      startTime: trip.startTime ? this.mapDateToTimestamp(trip.startTime) : null,
      endTime: trip.endTime ? this.mapDateToTimestamp(trip.endTime) : null,
      status: this.mapTripStatusToProto(trip.status),
      odometerStart: trip.odometerStart,
      odometerEnd: trip.odometerEnd || 0,
      distanceKmReal: trip.distanceKmReal || 0,
      distanceKmPlanned: trip.distanceKmPlanned,
      fuelEstimated: trip.fuelEstimated,
      fuelActual: trip.fuelActual || 0,
      reviewComment: trip.reviewComment || '',
      createdAt: this.mapDateToTimestamp(trip.createdAt),
      updatedAt: this.mapDateToTimestamp(trip.updatedAt),
      currentLat: trip.currentLat ?? 0,
      currentLng: trip.currentLng ?? 0,
      currentDistance: trip.currentDistance ?? 0,
    };
  }

  static toProtoEnriched(trip: TripEnriched): any {
    return {
      id: trip.id.toString(),
      routeId: trip.routeId.toString(),
      supervisorId: trip.supervisorId.toString(),
      driverId: trip.driverId.toString(),
      vehicleId: trip.vehicleId.toString(),
      startTime: trip.startTime ? this.mapDateToTimestamp(trip.startTime) : null,
      endTime: trip.endTime ? this.mapDateToTimestamp(trip.endTime) : null,
      status: this.mapTripStatusToProto(trip.status),
      odometerStart: trip.odometerStart,
      odometerEnd: trip.odometerEnd || 0,
      distanceKmReal: trip.distanceKmReal || 0,
      distanceKmPlanned: trip.distanceKmPlanned,
      fuelEstimated: trip.fuelEstimated,
      fuelActual: trip.fuelActual || 0,
      reviewComment: trip.reviewComment || '',
      createdAt: this.mapDateToTimestamp(trip.createdAt),
      updatedAt: this.mapDateToTimestamp(trip.updatedAt),
      currentLat: trip.currentLat ?? 0,
      currentLng: trip.currentLng ?? 0,
      currentDistance: trip.currentDistance ?? 0,
      // Información enriquecida
      vehicleInfo: {
        id: trip.vehicleInfo.id,
        plate: trip.vehicleInfo.plate,
        requiredLicenses: trip.vehicleInfo.requiredLicenses || [],
      },
      driverInfo: {
        id: trip.driverInfo.id,
        firstName: trip.driverInfo.firstName,
        lastName: trip.driverInfo.lastName,
        email: trip.driverInfo.email,
      },
      supervisorInfo: {
        id: trip.supervisorInfo.id,
        firstName: trip.supervisorInfo.firstName,
        lastName: trip.supervisorInfo.lastName,
        email: trip.supervisorInfo.email,
      },
    };
  }

  static fromProto(proto: any): Trip {
    return {
      id: BigInt(proto.id),
      routeId: BigInt(proto.routeId),
      supervisorId: BigInt(proto.supervisorId),
      driverId: BigInt(proto.driverId),
      vehicleId: BigInt(proto.vehicleId),
      startTime: proto.startTime ? this.mapTimestampToDate(proto.startTime) : null,
      endTime: proto.endTime ? this.mapTimestampToDate(proto.endTime) : null,
      status: this.mapTripStatusFromProto(proto.status),
      odometerStart: proto.odometerStart,
      odometerEnd: proto.odometerEnd || null,
      distanceKmReal: proto.distanceKmReal || null,
      distanceKmPlanned: proto.distanceKmPlanned,
      fuelEstimated: proto.fuelEstimated,
      fuelActual: proto.fuelActual || null,
      reviewComment: proto.reviewComment || null,
      createdAt: this.mapTimestampToDate(proto.createdAt),
      updatedAt: this.mapTimestampToDate(proto.updatedAt),
    };
  }

  private static mapTripStatusToProto(status: TripStatus): number {
    switch (status) {
      case TripStatus.CREADO:
        return 1; // CREADO
      case TripStatus.EN_RUTA:
        return 2; // EN_RUTA
      case TripStatus.EN_REVISION:
        return 3; // EN_REVISION
      case TripStatus.TERMINADO:
        return 4; // TERMINADO
      default:
        return 0; // UNSPECIFIED
    }
  }

  private static mapTripStatusFromProto(protoStatus: number): TripStatus {
    switch (protoStatus) {
      case 1:
        return TripStatus.CREADO;
      case 2:
        return TripStatus.EN_RUTA;
      case 3:
        return TripStatus.EN_REVISION;
      case 4:
        return TripStatus.TERMINADO;
      default:
        throw new Error(`Invalid trip status: ${protoStatus}`);
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
