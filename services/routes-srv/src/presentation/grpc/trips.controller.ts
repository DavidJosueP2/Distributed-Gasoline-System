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
  DeleteTripDto,
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
        routeData: request.routeData
          ? {
              name: request.routeData.name,
              originName: request.routeData.originName,
              originLat: request.routeData.originLat,
              originLng: request.routeData.originLng,
              destinationName: request.routeData.destinationName,
              destinationLat: request.routeData.destinationLat,
              destinationLng: request.routeData.destinationLng,
              distanceKm: request.routeData.distanceKm,
              vehicleType: request.routeData.vehicleType as any,
            }
          : undefined,
      });

      return {
        id: result.id.toString(),
        fuelEstimated: result.fuelEstimated,
        routeId: result.routeId?.toString(),
      };
    } catch (error) {
      this.logger.error(
        `CreateTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
        routeName: trip.routeName || '',
        originName: trip.originName || '',
        destinationName: trip.destinationName || '',
        originLat: trip.originLat ?? 0,
        originLng: trip.originLng ?? 0,
        destinationLat: trip.destinationLat ?? 0,
        destinationLng: trip.destinationLng ?? 0,
      };
    } catch (error) {
      this.logger.error(
        `GetTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
        userRole = userInfo.roles.includes('ADMIN')
          ? 'ADMIN'
          : userInfo.roles.includes('SUPERVISOR')
            ? 'SUPERVISOR'
            : userInfo.roles.includes('DRIVER')
              ? 'DRIVER'
              : 'GUEST';

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
            const driverId = await driversClient.getDriverIdByUserId(
              userInfo.userId,
            );
            driverIdFilter = driverId;
          } catch (driverError) {
            this.logger.warn(
              `Could not find driver for user_id=${userInfo.userId}: ${(driverError as any)?.message}`,
            );
          }
        }
        // ADMIN ve todos (sin filtros)
      } catch (tokenError) {
        this.logger.warn(
          `ListTrips token extraction failed: ${(tokenError as any)?.message}`,
        );
        // Si no hay token o es inválido, continuar sin filtros
        // Esto permite que endpoints públicos funcionen
      }

      // Obtener todos los viajes según los filtros (enriquecidos con info adicional)
      const allTrips = await this.tripService.listTripsEnriched(
        undefined,
        driverIdFilter,
        supervisorIdFilter,
      );

      // Separar por secciones
      const tripsByStatus = {
        CREADO: allTrips.filter((trip) => trip.status === 'CREADO'),
        EN_RUTA: allTrips.filter((trip) => trip.status === 'EN_RUTA'),
        EN_REVISION: allTrips.filter((trip) => trip.status === 'EN_REVISION'),
        TERMINADO: allTrips.filter((trip) => trip.status === 'TERMINADO'),
      };

      const response = {
        trips: {
          CREADO: tripsByStatus.CREADO.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
          EN_RUTA: tripsByStatus.EN_RUTA.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
          EN_REVISION: tripsByStatus.EN_REVISION.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
          TERMINADO: tripsByStatus.TERMINADO.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
        },
        userRole,
        totalTrips: allTrips.length,
      };
      return response;
    } catch (error) {
      this.logger.error(
        `ListTrips error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
      this.logger.error(
        `UpdateTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
          callerDriverId = await driversClient.getDriverIdByUserId(
            userInfo.userId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not extract driver info: ${(error as any)?.message}`,
        );
      }

      const startTime = await this.tripService.startTrip(
        BigInt(request.id),
        callerDriverId,
        request.currentLat,
        request.currentLng,
      );
      return {
        startTime: {
          seconds: Math.floor(startTime.getTime() / 1000),
          nanos: (startTime.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      this.logger.error(
        `StartTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
          callerDriverId = await driversClient.getDriverIdByUserId(
            userInfo.userId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not extract driver info: ${(error as any)?.message}`,
        );
      }

      const result = await this.tripService.finishTrip(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        callerDriverId,
      );
      return {
        endTime: {
          seconds: Math.floor(result.endTime.getTime() / 1000),
          nanos: (result.endTime.getTime() % 1000) * 1e6,
        },
      };
    } catch (error) {
      this.logger.error(
        `FinishTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'CheckLocationWarning')
  async checkLocationWarning(request: any): Promise<any> {
    try {
      const result = await this.tripService.checkLocationWarning(
        BigInt(request.routeId),
        request.currentLat,
        request.currentLng,
      );
      return {
        isWithinMargin: result.isWithinMargin,
        distanceKm: result.distanceKm,
        allowedMarginKm: result.allowedMarginKm,
        deviationPercentage: result.deviationPercentage,
      };
    } catch (error) {
      this.logger.error(
        `CheckLocationWarning error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
        request.reviewComment,
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
      this.logger.error(
        `ReviewTrip error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
          callerDriverId = await driversClient.getDriverIdByUserId(
            userInfo.userId,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not extract driver info: ${(error as any)?.message}`,
        );
      }

      await this.tripService.updateTripLocation(
        BigInt(request.id),
        request.currentLat,
        request.currentLng,
        request.currentDistance,
        callerDriverId,
      );
      return {};
    } catch (error) {
      this.logger.error(
        `UpdateTripLocation error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
      this.logger.error(
        `CalculateTripMetrics error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
      this.logger.log(
        `GetAssignableDrivers - Received ${drivers.length} drivers from service`,
      );

      // Mapear en camelCase (como users-srv) - NestJS transformará a snake_case según el proto
      // El proto espera int64 para id y user_id, pero NestJS transforma automáticamente
      const mapped = drivers.map((d) => {
        // Convertir id - puede venir como string o number
        let idValue: number = 0;
        if (typeof d.id === 'string') {
          idValue = parseInt(d.id, 10);
        } else if (typeof d.id === 'number') {
          idValue = d.id;
        } else if (d.id) {
          idValue = Number(d.id);
        }

        // Convertir userId - puede venir como string, number o Long de gRPC
        let userIdValue: number = 0;
        if (typeof d.userId === 'string') {
          userIdValue = parseInt(d.userId, 10);
        } else if (typeof d.userId === 'number') {
          userIdValue = d.userId;
        } else if (
          d.userId &&
          typeof d.userId === 'object' &&
          'low' in (d.userId as any)
        ) {
          userIdValue = (d.userId as any).low || 0;
        } else if (d.userId) {
          userIdValue = Number(d.userId);
        }

        // Devolver en camelCase - NestJS transformará automáticamente a snake_case según el proto
        const mappedDriver = {
          id: isNaN(idValue) || idValue <= 0 ? 0 : idValue,
          userId: isNaN(userIdValue) || userIdValue <= 0 ? 0 : userIdValue,
          firstName: String(d.firstName || ''),
          lastName: String(d.lastName || ''),
          isAssignable: Boolean(d.isAssignable),
          licenseTypeCodes: Array.isArray(d.licenseTypeCodes)
            ? d.licenseTypeCodes
            : [],
        };

        this.logger.debug(
          `Mapping driver - Original: id=${d.id} (${typeof d.id}), userId=${d.userId} (${typeof d.userId}), firstName="${d.firstName}", lastName="${d.lastName}", licenses=${JSON.stringify(d.licenseTypeCodes)}`,
        );
        this.logger.debug(
          `Mapping driver - Mapped (camelCase): id=${mappedDriver.id}, userId=${mappedDriver.userId}, firstName="${mappedDriver.firstName}", lastName="${mappedDriver.lastName}", licenses=${JSON.stringify(mappedDriver.licenseTypeCodes)}`,
        );

        return mappedDriver;
      });

      const response = { drivers: mapped };
      this.logger.log(
        `GetAssignableDrivers response (camelCase): ${JSON.stringify(response, null, 2)}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `GetAssignableDrivers error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'GetAssignableVehicles')
  async getAssignableVehicles(request?: any): Promise<any> {
    try {
      // Extraer parámetros opcionales del request
      // Priorizar camelCase (comunicación entre servicios NestJS) y luego snake_case (Postman directo)
      const driverLicenseTypeCodes =
        request?.driverLicenseTypeCodes || request?.driver_license_type_codes;
      const routeVehicleType =
        request?.routeVehicleType || request?.route_vehicle_type;

      const vehicles = await this.tripService.getAssignableVehicles(
        driverLicenseTypeCodes
          ? Array.isArray(driverLicenseTypeCodes)
            ? driverLicenseTypeCodes
            : [driverLicenseTypeCodes]
          : undefined,
        routeVehicleType as VehicleType,
      );

      return { vehicles };
    } catch (error) {
      this.logger.error(
        `GetAssignableVehicles error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
      this.logger.error(
        `GetAssignableSupervisors error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTripsByVehicleType')
  async listTripsByVehicleType(
    request: ListTripsByVehicleTypeDto,
  ): Promise<any> {
    try {
      this.logger.log(
        `ListTripsByVehicleType called with request: ${JSON.stringify(request)}`,
      );
      this.logger.log(`Vehicle type filter: ${request.vehicleTypeFilter}`);

      const segmentedTrips =
        await this.tripService.listTripsEnrichedByVehicleType(
          request.vehicleTypeFilter,
        );

      this.logger.log(
        `Trips segmented - LIVIANO: ${segmentedTrips.LIVIANO.length}, PESADO: ${segmentedTrips.PESADO.length}, CUALQUIERA: ${segmentedTrips.CUALQUIERA.length}, Total: ${segmentedTrips.total}`,
      );

      return {
        trips: {
          LIVIANO: segmentedTrips.LIVIANO.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
          PESADO: segmentedTrips.PESADO.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
          CUALQUIERA: segmentedTrips.CUALQUIERA.map((t) =>
            TripGrpcMapper.toProtoEnriched(t),
          ),
        },
        totalTrips: segmentedTrips.total,
      };
    } catch (error) {
      this.logger.error(
        `ListTripsByVehicleType error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Error interno del servidor',
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTripsByDriver')
  async listTripsByDriver(request: any): Promise<any> {
    try {
      this.logger.log(
        `ListTripsByDriver called with driverId: ${request.driverId}, statusFilter: ${JSON.stringify(request.statusFilter)}`,
      );

      // Convertir driverId a bigint
      const driverId = BigInt(request.driverId || request.driver_id);

      // Convertir statusFilter de números o strings a TripStatus si existe
      // Manejar tanto camelCase como snake_case
      const statusFilterArray =
        request.statusFilter || request.status_filter || [];
      let statusFilters: TripStatus[] | undefined;
      if (statusFilterArray && statusFilterArray.length > 0) {
        statusFilters = statusFilterArray.map((status: number | string) => {
          // Si es un número, usar directamente
          if (typeof status === 'number') {
            switch (status) {
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
                  message: `Estado de viaje inválido: ${status}`,
                });
            }
          }
          // Si es un string, convertir a TripStatus
          if (typeof status === 'string') {
            const statusUpper = status.toUpperCase();
            switch (statusUpper) {
              case 'CREADO':
              case '1':
                return TripStatus.CREADO;
              case 'EN_RUTA':
              case '2':
                return TripStatus.EN_RUTA;
              case 'EN_REVISION':
              case '3':
                return TripStatus.EN_REVISION;
              case 'TERMINADO':
              case '4':
                return TripStatus.TERMINADO;
              default:
                throw new RpcException({
                  code: GrpcStatus.INVALID_ARGUMENT,
                  message: `Estado de viaje inválido: ${status}`,
                });
            }
          }
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: `Estado de viaje inválido: ${status}`,
          });
        });
      }

      const trips = await this.tripService.listTripsEnrichedByDriver(
        driverId,
        statusFilters,
      );

      this.logger.log(`Found ${trips.length} trips for driver ${driverId}`);

      console.log('trips finales', trips);

      return {
        trips: trips.map((t) => TripGrpcMapper.toProtoDriverDetail(t)),
        totalTrips: trips.length,
      };
    } catch (error) {
      this.logger.error(
        `ListTripsByDriver error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${(error as any)?.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('TripsService', 'ListTripsByTimeRange')
  async listTripsByTimeRange(request: any): Promise<any> {
    Logger.log('request', JSON.stringify(request));

    try {
      this.logger.log(
        `ListTripsByTimeRange called with raw request: ${JSON.stringify(request)}`,
      );

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

        this.logger.log(
          `Reading dates from request: start_time=${startTimeStr}, end_time=${endTimeStr}`,
        );

        if (!startTimeStr || typeof startTimeStr !== 'string') {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message:
              'La fecha de inicio es obligatoria y debe ser un string en formato YYYY-MM-DD',
          });
        }

        if (!endTimeStr || typeof endTimeStr !== 'string') {
          throw new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message:
              'La fecha de fin es obligatoria y debe ser un string en formato YYYY-MM-DD',
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

      this.logger.log(
        `Using dates - Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}`,
      );

      const trips = await this.tripService.listTripsEnrichedByTimeRange(
        startTime,
        endTime,
      );

      this.logger.log(`Found ${trips.length} trips in time range`);

      return {
        trips: trips.map((t) => TripGrpcMapper.toProtoEnriched(t)),
        totalTrips: trips.length,
      };
    } catch (error) {
      this.logger.error(
        `ListTripsByTimeRange error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${(error as any)?.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('TripsService', 'HasTripsBySupervisor')
  async hasTripsBySupervisor(request: any): Promise<any> {
    try {
      const supervisorId = BigInt(request.supervisorId || request.supervisor_id || 0);
      const hasTrips = await this.tripService.hasTripsBySupervisor(supervisorId);
      return { hasTrips };
    } catch (error) {
      this.logger.error(
        `HasTripsBySupervisor error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${(error as any)?.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('TripsService', 'HasTripsByDriver')
  async hasTripsByDriver(request: any): Promise<any> {
    try {
      const driverId = BigInt(request.driverId || request.driver_id || 0);
      const hasTrips = await this.tripService.hasTripsByDriver(driverId);
      return { hasTrips };
    } catch (error) {
      this.logger.error(
        `HasTripsByDriver error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: `Error interno del servidor: ${(error as any)?.message || 'Error desconocido'}`,
      });
    }
  }

  @GrpcMethod('TripsService', 'HasTripsByVehicle')
  async hasTripsByVehicle(request: any): Promise<any> {
    try {
      const vehicleId = BigInt(request.vehicleId || request.vehicle_id || 0);
      const hasTrips = await this.tripService.hasTripsByVehicle(vehicleId);
      return { hasTrips };
    } catch (error) {
      this.logger.error(
        `HasTripsByVehicle error: ${(error as any)?.message}`,
        (error as any)?.stack,
      );
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
