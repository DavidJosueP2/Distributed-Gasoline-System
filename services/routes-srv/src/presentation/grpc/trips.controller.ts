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
  ) {}

  private readonly logger = new Logger(TripsController.name);

  @GrpcMethod('TripsService', 'CreateTrip')
  async createTrip(request: CreateTripDto): Promise<any> {
    try {
      this.logger.log(`CreateTrip request: ${JSON.stringify(request)}`);
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

      this.logger.log(`CreateTrip success: ${JSON.stringify(result)}`);
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
      this.logger.log(`GetTrip request: ${JSON.stringify(request)}`);
      const trip = await this.tripService.getTripEnriched(BigInt(request.id));
      this.logger.log(`GetTrip success: ${trip.id.toString()}`);
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
      this.logger.log(`ListTrips request: ${JSON.stringify(request)}`);
      try {
        const rawAuth = (metadata as any)?.get?.('authorization')?.[0]
          || (metadata as any)?.get?.('Authorization')?.[0];
        const authHeader = typeof rawAuth === 'string' ? rawAuth : (Buffer.isBuffer(rawAuth) ? rawAuth.toString('utf8') : undefined);
        this.logger.log(`ListTrips metadata auth: ${authHeader ? '[present]' : '[missing]'}`);
      } catch {}
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
          driverIdFilter = userInfo.userId;
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
      this.logger.log(`ListTrips success: role=${userRole} total=${allTrips.length}`);
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
      this.logger.log(`UpdateTrip request: ${JSON.stringify(request)}`);
      const trip = await this.tripService.updateTrip(BigInt(request.id), {
        driverId: request.driverId ? BigInt(request.driverId) : undefined,
        vehicleId: request.vehicleId ? BigInt(request.vehicleId) : undefined,
      });

      this.logger.log(`UpdateTrip success: ${trip.id.toString()}`);
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
      this.logger.log(`StartTrip request: ${JSON.stringify(request)}`);
      const startTime = await this.tripService.startTrip(BigInt(request.id));
      this.logger.log(`StartTrip success: id=${request.id}`);
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
      this.logger.log(`FinishTrip request: ${JSON.stringify(request)}`);
      const result = await this.tripService.finishTrip(
        BigInt(request.id)
      );
      this.logger.log(`FinishTrip success: id=${request.id}`);
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
      this.logger.log(`ReviewTrip request: ${JSON.stringify(request)}`);
      const result = await this.tripService.reviewTrip(
        BigInt(request.id),
        request.odometerEnd,
        request.reviewComment
      );
      this.logger.log(`ReviewTrip success: id=${request.id}`);
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
      this.logger.log(`UpdateTripLocation request: ${JSON.stringify(request)}`);
      await this.tripService.updateTripLocation(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        request.currentDistance
      );
      this.logger.log(`UpdateTripLocation success: id=${request.id}`);
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
      this.logger.log(`CalculateTripMetrics request: ${JSON.stringify(request)}`);
      const result = await this.tripService.calculateTripMetrics(
        BigInt(request.id),
        request.odometerEnd,
      );
      this.logger.log(`CalculateTripMetrics success: id=${request.id}`);
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
