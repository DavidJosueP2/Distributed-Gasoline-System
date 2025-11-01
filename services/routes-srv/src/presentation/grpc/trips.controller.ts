// src/presentation/grpc/trips.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { TripService } from '../../application/services/trip.service';
import { TokenExtractorService } from '../../common/auth/token-extractor.service';
import { GetUserInfo } from '../../common/auth/decorators/get-user.decorator';
import { TripGrpcMapper } from '../../infra/grpc/mappers/trip-grpc.mapper';
import { TripStatus } from '../../domain/value-objects/trip-status.vo';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { GrpcClientFactory } from '../../infra/grpc/grpc-client.factory';
import { DriversClient } from '../../infra/clients/drivers.client';
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
  constructor(
    private readonly tripService: TripService,
    private readonly tokenExtractor: TokenExtractorService,
    private readonly grpcFactory: GrpcClientFactory,
  ) {}

  private readonly logger = new Logger(TripsController.name);

  @GrpcMethod('TripsService', 'CreateTrip')
  async createTrip(request: CreateTripDto): Promise<any> {
    try {
      const result = await this.tripService.createTrip({
        routeId: request.routeId ? BigInt(request.routeId) : undefined,
        supervisorId: BigInt(request.supervisorId),
        driverId: BigInt(request.driverId),
        vehicleId: BigInt(request.vehicleId),
        createRouteIfNotExists: request.createRouteIfNotExists,
        routeData: request.routeData ? {
          name: request.routeData.name,
          originName: request.routeData.originName,
          originLat: request.routeData.originLat,
          originLng: request.routeData.originLng,
          destinationName: request.routeData.destinationName,
          destinationLat: request.routeData.destinationLat,
          destinationLng: request.routeData.destinationLng,
          distanceKm: request.routeData.distanceKm,
          vehicleType: request.routeData.vehicleType as any,
        } : undefined,
      });

      return {
        id: result.id.toString(),
        fuelEstimated: result.fuelEstimated,
        routeId: result.routeId?.toString(),
      };
    } catch (error) {
      this.logger.error(`CreateTrip error: ${(error as any)?.message}`, (error as any)?.stack);
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
      this.logger.error(`GetTrip error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTrips')
  async listTrips(request: any, @GetUserInfo() metadata: Metadata): Promise<any> {
    try {
      // Extraer información del token
      let supervisorIdFilter: bigint | undefined = undefined;
      let driverIdFilter: bigint | undefined = undefined;
      let userRole: string = 'GUEST';
      
      try {
        const userInfo = this.tokenExtractor.extractUserInfo(metadata);
        userRole = userInfo.roles.includes('ADMIN') ? 'ADMIN' : 
                  userInfo.roles.includes('SUPERVISOR') ? 'SUPERVISOR' : 
                  userInfo.roles.includes('DRIVER') ? 'DRIVER' : 'GUEST';
        
        // Filtros según el rol
        if (this.tokenExtractor.isSupervisor(userInfo)) {
          supervisorIdFilter = userInfo.userId;
        } else if (this.tokenExtractor.isDriver(userInfo)) {
          // Para DRIVER, necesitamos obtener el driver_id desde la tabla de conductores
          try {
            const client = await this.grpcFactory.clientFor(
              'DRIVER-SERVICE',
              'driverms.v1',
              'driver_ms.proto',
            );
            const driversClient = new DriversClient(client);
            const driverId = await driversClient.getDriverIdByUserId(userInfo.userId);
            driverIdFilter = driverId;
          } catch (driverError) {
            this.logger.warn(`Could not find driver for user_id=${userInfo.userId}: ${(driverError as any)?.message}`);
          }
        }
        // ADMIN ve todos (sin filtros)
      } catch (tokenError) {
        this.logger.warn(`ListTrips token extraction failed: ${(tokenError as any)?.message}`);
        // Si no hay token o es inválido, continuar sin filtros
        // Esto permite que endpoints públicos funcionen
      }

      // Obtener todos los viajes según los filtros
      const allTrips = await this.tripService.listTrips(undefined, driverIdFilter, supervisorIdFilter);
      
      // Separar por secciones
      const tripsByStatus = {
        CREADO: allTrips.filter(trip => trip.status === 'CREADO'),
        EN_RUTA: allTrips.filter(trip => trip.status === 'EN_RUTA'),
        EN_REVISION: allTrips.filter(trip => trip.status === 'EN_REVISION'),
        TERMINADO: allTrips.filter(trip => trip.status === 'TERMINADO')
      };

      const response = {
        trips: {
          CREADO: tripsByStatus.CREADO.map((t) => TripGrpcMapper.toProto(t)),
          EN_RUTA: tripsByStatus.EN_RUTA.map((t) => TripGrpcMapper.toProto(t)),
          EN_REVISION: tripsByStatus.EN_REVISION.map((t) => TripGrpcMapper.toProto(t)),
          TERMINADO: tripsByStatus.TERMINADO.map((t) => TripGrpcMapper.toProto(t))
        },
        userRole,
        totalTrips: allTrips.length
      };
      return response;
    } catch (error) {
      this.logger.error(`ListTrips error: ${(error as any)?.message}`, (error as any)?.stack);
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
      this.logger.error(`UpdateTrip error: ${(error as any)?.message}`, (error as any)?.stack);
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
      this.logger.error(`StartTrip error: ${(error as any)?.message}`, (error as any)?.stack);
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
        BigInt(request.id)
      );
      return {
        endTime: {
          seconds: Math.floor(result.endTime.getTime() / 1000),
          nanos: (result.endTime.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      this.logger.error(`FinishTrip error: ${(error as any)?.message}`, (error as any)?.stack);
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
      const result = await this.tripService.reviewTrip(
        BigInt(request.id),
        request.odometerEnd,
        request.reviewComment
      );
      return {
        reviewedAt: {
          seconds: Math.floor(result.reviewedAt.getTime() / 1000),
          nanos: (result.reviewedAt.getTime() % 1000) * 1e6,
        },
        distanceKmReal: result.distanceKmReal,
        fuelActual: result.fuelActual,
      };
    } catch (error) {
      this.logger.error(`ReviewTrip error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'UpdateTripLocation')
  async updateTripLocation(request: any): Promise<any> {
    try {
      await this.tripService.updateTripLocation(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        request.currentDistance
      );
      return {};
    } catch (error) {
      this.logger.error(`UpdateTripLocation error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'CalculateTripMetrics')
  async calculateTripMetrics(request: any): Promise<any> {
    try {
      const result = await this.tripService.calculateTripMetrics(
        BigInt(request.id),
        request.odometerEnd,
      );
      return {
        distanceKmReal: result.distanceKmReal,
        fuelActual: result.fuelActual,
      };
    } catch (error) {
      this.logger.error(`CalculateTripMetrics error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'GetAssignableDrivers')
  async getAssignableDrivers(): Promise<any> {
    try {
      const drivers = await this.tripService.getAssignableDrivers();
      return { drivers };
    } catch (error) {
      this.logger.error(`GetAssignableDrivers error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'GetAssignableVehicles')
  async getAssignableVehicles(): Promise<any> {
    try {
      const vehicles = await this.tripService.getAssignableVehicles();
      return { vehicles };
    } catch (error) {
      this.logger.error(`GetAssignableVehicles error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'GetAssignableSupervisors')
  async getAssignableSupervisors(): Promise<any> {
    try {
      const supervisors = await this.tripService.getAssignableSupervisors();
      return { supervisors };
    } catch (error) {
      this.logger.error(`GetAssignableSupervisors error: ${(error as any)?.message}`, (error as any)?.stack);
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
