// src/presentation/grpc/trips.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { TripService } from '../../application/services/trip.service';
import { TripGrpcMapper } from '../../infra/grpc/mappers/trip-grpc.mapper';
import { TripStatus } from '../../domain/value-objects/trip-status.vo';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { 
  CreateTripDto, 
  UpdateTripDto, 
  GetTripDto, 
  ListTripsDto, 
  StartTripDto,
  FinishTripDto,
  ReviewTripDto,
  DeleteTripDto 
} from '../../application/dto/trips';

@Controller()
export class TripsController {
  constructor(private readonly tripService: TripService) {}

  @GrpcMethod('TripsService', 'CreateTrip')
  async createTrip(request: CreateTripDto): Promise<any> {
    try {
      const result = await this.tripService.createTrip({
        routeId: BigInt(request.routeId),
        supervisorId: BigInt(request.supervisorId),
        driverId: BigInt(request.driverId),
        vehicleId: BigInt(request.vehicleId),
      });

      return {
        id: result.id.toString(),
        fuelEstimated: result.fuelEstimated,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'GetTrip')
  async getTrip(request: any): Promise<any> {
    try {
      const trip = await this.tripService.getTripEnriched(BigInt(request.id));
      return { trip: TripGrpcMapper.toProtoEnriched(trip) };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTrips')
  async listTrips(request: any): Promise<any> {
    try {
      const statusFilter = request.statusFilter 
        ? this.mapTripStatusFromProto(request.statusFilter)
        : undefined;
      
      const driverIdFilter = request.driverIdFilter 
        ? BigInt(request.driverIdFilter)
        : undefined;

      const trips = await this.tripService.listTrips(statusFilter, driverIdFilter);
      return { trips: trips.map(TripGrpcMapper.toProto) };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'UpdateTrip')
  async updateTrip(request: any): Promise<any> {
    try {
      const trip = await this.tripService.updateTrip(BigInt(request.id), {
        driverId: request.driverId ? BigInt(request.driverId) : undefined,
        vehicleId: request.vehicleId ? BigInt(request.vehicleId) : undefined,
      });

      return TripGrpcMapper.toProto(trip);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'StartTrip')
  async startTrip(request: any): Promise<any> {
    try {
      const startTime = await this.tripService.startTrip(BigInt(request.id));
      return {
        startTime: {
          seconds: Math.floor(startTime.getTime() / 1000),
          nanos: (startTime.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'FinishTrip')
  async finishTrip(request: any): Promise<any> {
    try {
      const result = await this.tripService.finishTrip(
        BigInt(request.id),
        request.odometerEnd
      );

      return {
        distanceKmReal: result.distanceKmReal,
        fuelActual: result.fuelActual,
        endTime: {
          seconds: Math.floor(result.endTime.getTime() / 1000),
          nanos: (result.endTime.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ReviewTrip')
  async reviewTrip(request: any): Promise<any> {
    try {
      const reviewedAt = await this.tripService.reviewTrip(
        BigInt(request.id),
        request.reviewComment
      );

      return {
        reviewedAt: {
          seconds: Math.floor(reviewedAt.getTime() / 1000),
          nanos: (reviewedAt.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  private mapTripStatusFromProto(protoStatus: number): TripStatus {
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
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: `Estado de viaje inválido: ${protoStatus}`,
        });
    }
  }
}
