// src/presentation/grpc/trips.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { TripService } from '../../application/services/trip.service';
import { TokenExtractorService } from '../../common/auth/token-extractor.service';
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
  ListTripsByVehicleTypeDto,
  ListTripsByTimeRangeDto,
  StartTripDto,
  FinishTripDto,
  ReviewTripDto,
  DeleteTripDto 
} from '../../application/dto/trips';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';

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
      
      // Retornar trip y campos enriquecidos
      return {
        trip: TripGrpcMapper.toProto(trip),
        driverInfo: {
          firstName: trip.driverInfo.firstName,
          lastName: trip.driverInfo.lastName,
        },
        supervisorInfo: {
          firstName: trip.supervisorInfo.firstName,
          lastName: trip.supervisorInfo.lastName,
        },
        vehicleInfo: {
          plate: trip.vehicleInfo.plate,
        },
      };
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
  async listTrips(request: any, metadata: Metadata): Promise<any> {
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
  async startTrip(request: any, metadata: Metadata): Promise<any> {
    try {
      // Extraer información del token
      let callerDriverId: bigint | undefined;
      
      try {
        const userInfo = this.tokenExtractor.extractUserInfo(metadata);
        
        // Si el usuario es DRIVER, validar que es el conductor asignado
        if (this.tokenExtractor.isDriver(userInfo)) {
          const client = await this.grpcFactory.clientFor(
            'DRIVER-SERVICE',
            'driverms.v1',
            'driver_ms.proto',
          );
          const driversClient = new DriversClient(client);
          callerDriverId = await driversClient.getDriverIdByUserId(userInfo.userId);
        }
      } catch (error) {
        this.logger.warn(`Could not extract driver info: ${(error as any)?.message}`);
      }
      
      const startTime = await this.tripService.startTrip(
        BigInt(request.id), 
        callerDriverId, 
        request.currentLat, 
        request.currentLng
      );
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
  async finishTrip(request: any, metadata: Metadata): Promise<any> {
    try {
      // Extraer información del token
      let callerDriverId: bigint | undefined;
      
      try {
        const userInfo = this.tokenExtractor.extractUserInfo(metadata);
        
        // Si el usuario es DRIVER, validar que es el conductor asignado
        if (this.tokenExtractor.isDriver(userInfo)) {
          const client = await this.grpcFactory.clientFor(
            'DRIVER-SERVICE',
            'driverms.v1',
            'driver_ms.proto',
          );
          const driversClient = new DriversClient(client);
          callerDriverId = await driversClient.getDriverIdByUserId(userInfo.userId);
        }
      } catch (error) {
        this.logger.warn(`Could not extract driver info: ${(error as any)?.message}`);
      }
      
      const result = await this.tripService.finishTrip(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        callerDriverId
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
  async updateTripLocation(request: any, metadata: Metadata): Promise<any> {
    try {
      // Extraer información del token
      let callerDriverId: bigint | undefined;
      
      try {
        const userInfo = this.tokenExtractor.extractUserInfo(metadata);
        
        // Si el usuario es DRIVER, validar que es el conductor asignado
        if (this.tokenExtractor.isDriver(userInfo)) {
          const client = await this.grpcFactory.clientFor(
            'DRIVER-SERVICE',
            'driverms.v1',
            'driver_ms.proto',
          );
          const driversClient = new DriversClient(client);
          callerDriverId = await driversClient.getDriverIdByUserId(userInfo.userId);
        }
      } catch (error) {
        this.logger.warn(`Could not extract driver info: ${(error as any)?.message}`);
      }
      
      await this.tripService.updateTripLocation(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        request.currentDistance,
        callerDriverId
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

  @GrpcMethod('TripsService', 'ListTripsByVehicleType')
  async listTripsByVehicleType(request: ListTripsByVehicleTypeDto): Promise<any> {
    try {
      this.logger.log(`ListTripsByVehicleType called with request: ${JSON.stringify(request)}`);
      this.logger.log(`Vehicle type filter: ${request.vehicleTypeFilter}`);
      
      const segmentedTrips = await this.tripService.listTripsByVehicleType(request.vehicleTypeFilter);
      
      this.logger.log(`Trips segmented - LIVIANO: ${segmentedTrips.LIVIANO.length}, PESADO: ${segmentedTrips.PESADO.length}, CUALQUIERA: ${segmentedTrips.CUALQUIERA.length}, Total: ${segmentedTrips.total}`);

      return {
        trips: {
          LIVIANO: segmentedTrips.LIVIANO.map(t => TripGrpcMapper.toProto(t)),
          PESADO: segmentedTrips.PESADO.map(t => TripGrpcMapper.toProto(t)),
          CUALQUIERA: segmentedTrips.CUALQUIERA.map(t => TripGrpcMapper.toProto(t))
        },
        totalTrips: segmentedTrips.total
      };
    } catch (error) {
      this.logger.error(`ListTripsByVehicleType error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTripsByTimeRange')
  async listTripsByTimeRange(request: any): Promise<any> {
    try {
      this.logger.log(`ListTripsByTimeRange called with raw request: ${JSON.stringify(request)}`);
      
      // Si el DTO no funcionó, leer directamente del request
      let startTime: Date;
      let endTime: Date;
      
      // Intentar leer desde el DTO transformado
      if (request.startTime instanceof Date) {
        startTime = request.startTime;
        endTime = request.endTime;
        this.logger.log(`Using transformed dates from DTO`);
      } else {
        // Leer directamente desde el request en snake_case
        const startTimeStr = request.start_time ?? request.startTime;
        const endTimeStr = request.end_time ?? request.endTime;
        
        this.logger.log(`Reading dates from request: start_time=${startTimeStr}, end_time=${endTimeStr}`);
        
        if (!startTimeStr || typeof startTimeStr !== 'string') {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: 'La fecha de inicio es obligatoria y debe ser un string en formato YYYY-MM-DD',
          });
        }
        
        if (!endTimeStr || typeof endTimeStr !== 'string') {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: 'La fecha de fin es obligatoria y debe ser un string en formato YYYY-MM-DD',
          });
        }
        
        // Validar formato
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startTimeStr)) {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: `La fecha de inicio debe estar en formato YYYY-MM-DD, recibido: ${startTimeStr}`,
          });
        }
        
        if (!/^\d{4}-\d{2}-\d{2}$/.test(endTimeStr)) {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: `La fecha de fin debe estar en formato YYYY-MM-DD, recibido: ${endTimeStr}`,
          });
        }
        
        // Crear fechas
        startTime = new Date(startTimeStr + 'T00:00:00.000Z');
        endTime = new Date(endTimeStr + 'T23:59:59.999Z');
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: 'Fechas inválidas',
          });
        }
      }

      this.logger.log(`Using dates - Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}`);

      const trips = await this.tripService.listTripsByTimeRange(startTime, endTime);

      this.logger.log(`Found ${trips.length} trips in time range`);

      return {
        trips: trips.map(t => TripGrpcMapper.toProto(t)),
        totalTrips: trips.length
      };
    } catch (error) {
      this.logger.error(`ListTripsByTimeRange error: ${(error as any)?.message}`, (error as any)?.stack);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${(error as any)?.message || 'Error desconocido'}`,
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
