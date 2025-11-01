// src/application/services/trip.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TOKENS } from '../tokens';
import { TripRepository } from '../../domain/repositories/trip.repository';
import { RouteRepository } from '../../domain/repositories/route.repository';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus, canTransitionTo } from '../../domain/value-objects/trip-status.vo';
import { VehicleType } from '../../domain/value-objects/vehicle-type.vo';
import { RouteService } from './route.service';
import { FuelCalculatorService } from '../../domain/services/fuel-calculator.service';
import { VehiclesClient } from '../../infra/clients/vehicles.client';
import { DriversClient } from '../../infra/clients/drivers.client';
import { UsersClient } from '../../infra/clients/users.client';
import { TripEnriched } from '../interfaces/trip-enriched.interface';
import { GrpcClientFactory } from '../../infra/grpc/grpc-client.factory';
import { 
  NotFoundException,
  InvalidTripStatusTransitionException,
  TripNotInCorrectStatusException,
  VehicleServiceUnavailableException,
  InvalidOdometerReadingException,
  ReviewCommentRequiredException,
  DriverBusyException,
  VehicleBusyException,
  DriverNotAtLocationException,
  DriverNotAtDestinationException,
  UnauthorizedSupervisorException,
  DriverLicenseMismatchException
} from '../exceptions';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    @Inject(TOKENS.TripRepository)
    private readonly tripRepo: TripRepository,
    @Inject(TOKENS.RouteRepository)
    private readonly routeRepo: RouteRepository,
    private readonly grpcFactory: GrpcClientFactory,
    private readonly routeService: RouteService,
  ) {}

  private async vehiclesClient(): Promise<VehiclesClient> {
    const client = await this.grpcFactory.clientFor(
      'VEHICLES-SERVICE',
      'vehicles.v1',
      'vehicles.proto',
    );
    return new VehiclesClient(client);
  }

  private async driversClient(): Promise<DriversClient> {
    const client = await this.grpcFactory.clientFor(
      'DRIVER-SERVICE',
      'driverms.v1',
      'driver_ms.proto',
    );
    return new DriversClient(client);
  }

  private async usersClient(): Promise<UsersClient> {
    const client = await this.grpcFactory.clientFor(
      'USERS-SERVICE',
      'users',
      'users.proto',
    );
    return new UsersClient(client);
  }

  async createTrip(input: {
    routeId?: bigint;
    supervisorId: bigint;
    driverId: bigint;
    vehicleId: bigint;
    createRouteIfNotExists?: boolean;
    routeData?: {
      name: string;
      originName: string;
      originLat: number;
      originLng: number;
      destinationName: string;
      destinationLat: number;
      destinationLng: number;
      distanceKm: number;
      vehicleType: VehicleType;
    };
  }): Promise<{ id: bigint; fuelEstimated: number; routeId?: bigint }> {
    let routeId = input.routeId;
    let route;

    // Si no se proporciona routeId pero se permite crear ruta automáticamente
    if (!routeId && input.createRouteIfNotExists && input.routeData) {
      this.logger.log('Creando ruta automáticamente...');
      
      // Crear la ruta usando el servicio de rutas
      const createdRoute = await this.routeService.createRoute({
        name: input.routeData.name,
        originName: input.routeData.originName,
        originLat: input.routeData.originLat,
        originLng: input.routeData.originLng,
        destinationName: input.routeData.destinationName,
        destinationLat: input.routeData.destinationLat,
        destinationLng: input.routeData.destinationLng,
        distanceKm: input.routeData.distanceKm,
        vehicleType: input.routeData.vehicleType,
      });
      
      routeId = createdRoute.id;
      route = createdRoute;
      this.logger.log(`Ruta creada automáticamente: ${createdRoute.name} (ID: ${createdRoute.id})`);
    } else if (routeId) {
      // Validar que la ruta existe
      route = await this.routeRepo.findById(routeId);
      if (!route) {
        throw new NotFoundException('Ruta no encontrada');
      }
    } else {
      throw new NotFoundException('Se requiere routeId o createRouteIfNotExists con routeData');
    }

    // Validar que todos los IDs existen
    await this.validateTripDependencies(input);

    // Validar que conductor no tenga 3 viajes activos o 1 en ruta
    await this.validateDriverAvailability(input.driverId);

    // Validar que vehículo no esté ocupado
    await this.validateVehicleAvailability(input.vehicleId);

    // Validar que supervisor no tenga más de 3 viajes activos
    await this.validateSupervisorAvailability(input.supervisorId);

    // TODO: Validar licencias del conductor vs licencias requeridas del vehículo
    // await this.validateDriverLicenses(input.driverId, input.vehicleId);

    // Obtener datos del vehículo
    try {
      const vehiclesClient = await this.vehiclesClient();
      const [odometerStart, consumptionProfile] = await Promise.all([
        vehiclesClient.getVehicleOdometer(input.vehicleId),
        vehiclesClient.getConsumptionProfile(input.vehicleId)
      ]);

      // Calcular consumo estimado
      const fuelEstimated = FuelCalculatorService.calculateEstimatedFuel(
        consumptionProfile.effectiveLPer100km,
        route.distanceKm
      );

      const trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'> = {
        routeId: routeId!,
        supervisorId: input.supervisorId, // Supervisor asignado desde el inicio
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        startTime: null,
        endTime: null,
        status: TripStatus.CREADO,
        odometerStart, // Obtener odómetro actual del vehículo
        odometerEnd: null,
        distanceKmReal: null,
        distanceKmPlanned: route.distanceKm,
        fuelEstimated,
        fuelActual: null,
        reviewComment: null,
      };

      const id = await this.tripRepo.create(trip);
      this.logger.log(`Trip created: ${id} for route ${routeId}`);
      
      return { 
        id, 
        fuelEstimated,
        routeId: input.createRouteIfNotExists ? routeId : undefined
      };
    } catch (error) {
      throw new VehicleServiceUnavailableException(input.vehicleId);
    }
  }

  async getTripEnriched(id: bigint): Promise<TripEnriched> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Obtener todos los clientes primero
    const [vehiclesClient, driversClient, usersClient] = await Promise.all([
      this.vehiclesClient(),
      this.driversClient(),
      this.usersClient()
    ]);

    // Obtener información enriquecida de todos los servicios
    const [vehicleInfo, driverInfo, supervisorInfo] = await Promise.all([
      vehiclesClient.getVehicleInfo(trip.vehicleId),
      driversClient.getDriverInfo(trip.driverId, usersClient),
      usersClient.getUserInfo(trip.supervisorId)
    ]);

    return {
      ...trip,
      vehicleInfo,
      driverInfo,
      supervisorInfo
    };
  }

  async listTrips(statusFilter?: TripStatus, driverIdFilter?: bigint, supervisorIdFilter?: bigint): Promise<Trip[]> {
    return await this.tripRepo.findAll(statusFilter, driverIdFilter, supervisorIdFilter);
  }

  async updateTrip(id: bigint, input: {
    driverId?: bigint;
    vehicleId?: bigint;
  }, userRole?: string): Promise<Trip> {
    const existingTrip = await this.tripRepo.findById(id);
    if (!existingTrip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Restricción: ADMIN no puede modificar viaje después de crearlo
    if (userRole === 'ADMIN') {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Los administradores no pueden modificar viajes después de crearlos. Solo pueden crear y consultar viajes.',
      });
    }

    // Solo permitir actualizaciones en viajes CREADO
    if (existingTrip.status !== TripStatus.CREADO) {
      throw new TripNotInCorrectStatusException('CREADO', existingTrip.status);
    }

    const updateData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>> = {};
    if (input.driverId !== undefined) updateData.driverId = input.driverId;
    if (input.vehicleId !== undefined) updateData.vehicleId = input.vehicleId;

    return await this.tripRepo.update(id, updateData);
  }

  async startTrip(id: bigint, callerDriverId?: bigint, currentLat?: number, currentLng?: number): Promise<Date> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Validar que el conductor que intenta iniciar el viaje es el asignado
    if (callerDriverId !== undefined && callerDriverId !== trip.driverId) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: `No tienes permiso para iniciar este viaje. El conductor asignado es ${trip.driverId}`,
      });
    }

    if (!canTransitionTo(trip.status, TripStatus.EN_RUTA)) {
      throw new InvalidTripStatusTransitionException(trip.status, TripStatus.EN_RUTA);
    }

    // Validar que el conductor no tenga otro viaje EN_RUTA
    const activeTrip = await this.tripRepo.findActiveTripByDriver(trip.driverId);
    if (activeTrip && activeTrip.id !== id) {
      throw new DriverBusyException(trip.driverId, activeTrip.id);
    }

    // Validar coordenadas si se proporcionan
    if (currentLat !== undefined && currentLng !== undefined) {
      await this.validateDriverLocation(trip.routeId, currentLat, currentLng);
    }

    const startTime = new Date();
    await this.tripRepo.update(id, {
      status: TripStatus.EN_RUTA,
      startTime,
      currentLat: currentLat ?? null,
      currentLng: currentLng ?? null,
    });

    // Actualizar status de driver y vehicle a ON_ROUTE
    try {
      const [driversClient, vehiclesClient] = await Promise.all([
        this.driversClient(),
        this.vehiclesClient()
      ]);
      
      await Promise.all([
        driversClient.updateDriverToOnRoute(trip.driverId),
        vehiclesClient.updateVehicleToOnRoute(trip.vehicleId)
      ]);
    } catch (error) {
      // Log error pero no fallar el viaje
      this.logger.error(`Error updating driver/vehicle status: ${error.message}`);
    }

    return startTime;
  }

  async finishTrip(id: bigint, currentLat?: number, currentLng?: number): Promise<{ endTime: Date }> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (trip.status !== TripStatus.EN_RUTA) {
      throw new TripNotInCorrectStatusException('EN_RUTA', trip.status);
    }

    // Validar que el conductor esté en el destino si se proporcionan coordenadas
    if (currentLat !== undefined && currentLng !== undefined) {
      await this.validateDriverAtDestination(trip.routeId, currentLat, currentLng);
    }

    const endTime = new Date();
    await this.tripRepo.update(id, {
      status: TripStatus.EN_REVISION,
      endTime,
    });

    // Nota: mantenemos driver/vehicle ocupados hasta la revisión
    return { endTime };
  }

  async reviewTrip(id: bigint, odometerEnd: number, reviewComment?: string, supervisorId?: bigint): Promise<{ reviewedAt: Date; distanceKmReal: number; fuelActual: number }> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (trip.status !== TripStatus.EN_REVISION) {
      throw new TripNotInCorrectStatusException('EN_REVISION', trip.status);
    }

    // Validar que el supervisor sea el asignado
    if (supervisorId && supervisorId !== trip.supervisorId) {
      throw new UnauthorizedSupervisorException(supervisorId, id);
    }

    // Validar lectura de odómetro
    if (odometerEnd <= trip.odometerStart) {
      throw new InvalidOdometerReadingException(trip.odometerStart, odometerEnd);
    }

    // Calcular distancia real
    const distanceKmReal = FuelCalculatorService.calculateRealDistance(
      trip.odometerStart,
      odometerEnd
    );

    // Obtener consumo efectivo y calcular consumo real
    try {
      const vehiclesClient = await this.vehiclesClient();
      const consumptionProfile = await vehiclesClient.getConsumptionProfile(trip.vehicleId);
      const fuelActual = FuelCalculatorService.calculateActualFuel(
        consumptionProfile.effectiveLPer100km,
        distanceKmReal
      );

      // Calcular desviación para requerir comentario si excede umbral
      const deviationPercentage = FuelCalculatorService.calculateDeviationPercentage(
        trip.distanceKmPlanned,
        distanceKmReal
      );
      if (FuelCalculatorService.requiresReviewComment(deviationPercentage) && !reviewComment?.trim()) {
        throw new ReviewCommentRequiredException(deviationPercentage);
      }

      const reviewedAt = new Date();
      await this.tripRepo.update(id, {
        status: TripStatus.TERMINADO,
        odometerEnd,
        distanceKmReal,
        fuelActual,
        reviewComment: reviewComment?.trim() || null,
      });

      // Liberar driver y vehículo
      try {
        const driversClient = await this.driversClient();
        const vehiclesClient = await this.vehiclesClient();
        
        this.logger.log(`Liberando driver ${trip.driverId} a AVAILABLE...`);
        const driverResult = await driversClient.updateDriverToAvailable(trip.driverId);
        this.logger.log(`Driver ${trip.driverId} liberado exitosamente`);
        
        this.logger.log(`Liberando vehicle ${trip.vehicleId} a ACTIVE...`);
        const vehicleResult = await vehiclesClient.updateVehicleToActive(trip.vehicleId);
        this.logger.log(`Vehicle ${trip.vehicleId} liberado exitosamente`);
      } catch (error) {
        this.logger.error(`Error updating driver/vehicle status: ${error.message}`, error.stack);
      }

      return { reviewedAt, distanceKmReal, fuelActual };
    } catch (error) {
      throw new VehicleServiceUnavailableException(trip.vehicleId);
    }
  }

  async calculateTripMetrics(id: bigint, odometerEnd: number): Promise<{ distanceKmReal: number; fuelActual: number }> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (odometerEnd <= trip.odometerStart) {
      throw new InvalidOdometerReadingException(trip.odometerStart, odometerEnd);
    }

    const distanceKmReal = FuelCalculatorService.calculateRealDistance(
      trip.odometerStart,
      odometerEnd
    );

    try {
      const vehiclesClient = await this.vehiclesClient();
      const consumptionProfile = await vehiclesClient.getConsumptionProfile(trip.vehicleId);
      const fuelActual = FuelCalculatorService.calculateActualFuel(
        consumptionProfile.effectiveLPer100km,
        distanceKmReal
      );
      return { distanceKmReal, fuelActual };
    } catch (error) {
      throw new VehicleServiceUnavailableException(trip.vehicleId);
    }
  }

  /**
   * Valida que todos los IDs de dependencias del viaje existan
   */
  private async validateTripDependencies(input: {
    supervisorId: bigint;
    driverId: bigint;
    vehicleId: bigint;
  }): Promise<void> {
    try {
      // Validar en paralelo para mejor rendimiento
      const [driversClient, vehiclesClient, usersClient] = await Promise.all([
        this.driversClient(),
        this.vehiclesClient(),
        this.usersClient()
      ]);

      const [driverInfo, vehicleInfo, supervisorInfo] = await Promise.all([
        driversClient.getDriverInfo(input.driverId),
        vehiclesClient.getVehicleInfo(input.vehicleId),
        usersClient.getUserInfo(input.supervisorId)
      ]);

      // Verificar que todos los datos existen
      if (!driverInfo) {
        throw new NotFoundException(`Conductor con ID ${input.driverId} no encontrado`);
      }
      if (!vehicleInfo) {
        throw new NotFoundException(`Vehículo con ID ${input.vehicleId} no encontrado`);
      }
      if (!supervisorInfo) {
        throw new NotFoundException(`Supervisor con ID ${input.supervisorId} no encontrado`);
      }

      // Si llegamos aquí, todos los IDs existen
      this.logger.log(`Validación exitosa: Driver ${input.driverId}, Vehicle ${input.vehicleId}, Supervisor ${input.supervisorId}`);
      
    } catch (error) {
      this.logger.error(`Error validando dependencias del viaje:`, error);
      
      // Determinar qué ID específico no existe basado en el error
      if (error.message?.includes('Driver') || error.message?.includes('driver')) {
        throw new NotFoundException(`Conductor con ID ${input.driverId} no encontrado`);
      }
      if (error.message?.includes('Vehicle') || error.message?.includes('vehicle')) {
        throw new NotFoundException(`Vehículo con ID ${input.vehicleId} no encontrado`);
      }
      if (error.message?.includes('User') || error.message?.includes('user') || error.message?.includes('supervisor')) {
        throw new NotFoundException(`Supervisor con ID ${input.supervisorId} no encontrado`);
      }
      
      // Error genérico si no podemos determinar el tipo
      throw new NotFoundException('Uno o más de los IDs proporcionados no existen');
    }
  }

  /**
   * Valida que el conductor no tenga más de 3 viajes activos ni 1 en ruta
   */
  private async validateDriverAvailability(driverId: bigint): Promise<void> {
    const activeTripsCount = await this.tripRepo.countActiveTripsByDriver(driverId);
    const enRutaCount = await this.tripRepo.countEnRutaTripsByDriver(driverId);
    
    if (activeTripsCount >= 3) {
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: `El conductor ${driverId} ya tiene ${activeTripsCount} viajes activos (máximo 3)`,
      });
    }
    
    if (enRutaCount >= 1) {
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: `El conductor ${driverId} ya tiene un viaje en ruta (máximo 1)`,
      });
    }

    this.logger.log(`Validación de disponibilidad del conductor exitosa: Driver ${driverId}`);
  }

  /**
   * Valida que el vehículo no esté ocupado
   */
  private async validateVehicleAvailability(vehicleId: bigint): Promise<void> {
    const activeVehicleTrip = await this.tripRepo.findActiveTripByVehicle(vehicleId);
    if (activeVehicleTrip) {
      throw new VehicleBusyException(vehicleId, activeVehicleTrip.id);
    }

    this.logger.log(`Validación de disponibilidad del vehículo exitosa: Vehicle ${vehicleId}`);
  }

  /**
   * Valida que el supervisor no tenga más de 3 viajes activos
   */
  private async validateSupervisorAvailability(supervisorId: bigint): Promise<void> {
    const activeTripsCount = await this.tripRepo.countActiveTripsBySupervisor(supervisorId);
    
    if (activeTripsCount >= 3) {
      throw new RpcException({
        code: GrpcStatus.RESOURCE_EXHAUSTED,
        message: `El supervisor ${supervisorId} ya tiene ${activeTripsCount} viajes activos (máximo 3)`,
      });
    }

    this.logger.log(`Validación de disponibilidad del supervisor exitosa: Supervisor ${supervisorId}`);
  }

  /**
   * Actualiza la ubicación del conductor durante el viaje
   */
  async updateTripLocation(id: bigint, currentLat: number, currentLng: number, currentDistance?: number): Promise<void> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (trip.status !== TripStatus.EN_RUTA) {
      throw new TripNotInCorrectStatusException(trip.status, 'EN_RUTA');
    }

    await this.tripRepo.update(id, {
      currentLat,
      currentLng,
      currentDistance: currentDistance ?? null,
    });

    this.logger.log(`Ubicación actualizada para viaje ${id}: (${currentLat}, ${currentLng}), distancia: ${currentDistance?.toFixed(2) || 'N/A'} km`);
  }

  /**
   * Valida que el conductor tenga las licencias necesarias para manejar el vehículo
   */
  private async validateDriverLicenses(driverId: bigint, vehicleId: bigint): Promise<void> {
    try {
      const [driversClient, vehiclesClient] = await Promise.all([
        this.driversClient(),
        this.vehiclesClient()
      ]);

      const [driverInfo, vehicleInfo] = await Promise.all([
        driversClient.getDriverInfo(driverId),
        vehiclesClient.getVehicleInfo(vehicleId)
      ]);

      // Verificar si el conductor puede manejar el vehículo
      const canDrive = await driversClient.canDrive(driverId, vehicleId);
      if (!canDrive) {
        throw new DriverLicenseMismatchException(
          driverId,
          vehicleId,
          driverInfo.licenses ?? [],
          (vehicleInfo as any).requiredLicenses ?? []
        );
      }

      this.logger.log(`Validación de licencias exitosa: Driver ${driverId} puede manejar Vehicle ${vehicleId}`);
    } catch (error) {
      if (error instanceof DriverLicenseMismatchException) {
        throw error;
      }
      this.logger.error(`Error validando licencias: ${error.message}`);
      throw new NotFoundException('Error validando licencias del conductor o vehículo');
    }
  }

  /**
   * Valida que el conductor esté en el destino correcto para finalizar el viaje
   */
  private async validateDriverAtDestination(routeId: bigint, currentLat: number, currentLng: number): Promise<void> {
    const route = await this.routeRepo.findById(routeId);
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // Calcular distancia entre ubicación actual y destino de la ruta
    const distance = this.calculateDistance(
      currentLat, currentLng,
      route.destinationLat, route.destinationLng
    );

    // Margen del 3% de la distancia total de la ruta
    const marginKm = route.distanceKm * 0.03;
    if (distance > marginKm) {
      throw new DriverNotAtDestinationException(
        route.destinationLat, route.destinationLng,
        currentLat, currentLng,
        3 // 3% de margen
      );
    }

    this.logger.log(`Validación de destino exitosa: Driver en destino (${currentLat}, ${currentLng})`);
  }

  /**
   * Valida que el conductor esté en la ubicación correcta para iniciar el viaje
   */
  private async validateDriverLocation(routeId: bigint, currentLat: number, currentLng: number): Promise<void> {
    const route = await this.routeRepo.findById(routeId);
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // Calcular distancia entre ubicación actual y origen de la ruta
    const distance = this.calculateDistance(
      currentLat, currentLng,
      route.originLat, route.originLng
    );

    // Margen del 3% de la distancia total de la ruta
    const marginKm = route.distanceKm * 0.03;
    if (distance > marginKm) {
      throw new DriverNotAtLocationException(
        route.originLat, route.originLng,
        currentLat, currentLng,
        3 // 3% de margen
      );
    }

    this.logger.log(`Validación de ubicación exitosa: Driver en origen (${currentLat}, ${currentLng})`);
  }

  /**
   * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convierte grados a radianes
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtiene lista de conductores asignables con información básica y bandera de disponibilidad
   */
  async getAssignableDrivers(): Promise<Array<{
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    isAssignable: boolean;
  }>> {
    try {
      const [driversClient, usersClient] = await Promise.all([
        this.driversClient(),
        this.usersClient()
      ]);
      const drivers = await driversClient.getAllDrivers();
      
      const result = await Promise.all(
        drivers.map(async (driver: any) => {
          const driverId = BigInt(driver.driverId || driver.id);
          const userId = BigInt(driver.userId || driver.user_id);
          
          // Obtener información del usuario desde el servicio users
          let firstName = '';
          let lastName = '';
          try {
            const userInfo = await usersClient.getUserInfo(userId);
            firstName = userInfo.firstName;
            lastName = userInfo.lastName;
          } catch (error) {
            this.logger.error(`Error getting user info for userId ${userId}:`, error);
          }
          
          const activeTripsCount = await this.tripRepo.countActiveTripsByDriver(driverId);
          const enRutaCount = await this.tripRepo.countEnRutaTripsByDriver(driverId);
          
          // Puede tener máximo 3 viajes activos y 1 en ruta
          const isAssignable = activeTripsCount < 3 && enRutaCount === 0;
          
          return {
            id: driverId.toString() as any,
            userId: userId.toString() as any,
            firstName,
            lastName,
            isAssignable
          };
        })
      );
      
      return result;
    } catch (error) {
      this.logger.error('Error getting assignable drivers:', error);
      return [];
    }
  }

  /**
   * Obtiene lista de vehículos asignables con información básica y bandera de disponibilidad
   */
  async getAssignableVehicles(): Promise<Array<{
    id: number;
    plate: string;
    isAssignable: boolean;
  }>> {
    try {
      const vehiclesClient = await this.vehiclesClient();
      const vehicles = await vehiclesClient.getAllVehicles();
      
      const result = await Promise.all(
        vehicles.map(async (vehicle: any) => {
          const vehicleId = BigInt(vehicle.vehicleId || vehicle.id);
          const activeVehicleTrip = await this.tripRepo.findActiveTripByVehicle(vehicleId);
          
          // Está disponible si no tiene viajes EN_RUTA
          const isAssignable = !activeVehicleTrip;
          
          const plate = vehicle.plate || '';
          
          return {
            id: vehicleId.toString() as any,
            plate,
            isAssignable
          };
        })
      );
      
      return result;
    } catch (error) {
      this.logger.error('Error getting assignable vehicles:', error);
      return [];
    }
  }

  /**
   * Obtiene lista de supervisores asignables con información básica y bandera de disponibilidad
   */
  async getAssignableSupervisors(): Promise<Array<{
    id: number;
    firstName: string;
    lastName: string;
    isAssignable: boolean;
    activeTripsCount: number;
  }>> {
    try {
      const usersClient = await this.usersClient();
      const supervisors = await usersClient.getAllSupervisors();
      
      const result = await Promise.all(
        supervisors.map(async (supervisor: any) => {
          const supervisorId = BigInt(supervisor.id);
          const activeTripsCount = await this.tripRepo.countActiveTripsBySupervisor(supervisorId);
          
          // Puede gestionar máximo 3 viajes activos
          const isAssignable = activeTripsCount < 3;
          
          return {
            id: supervisorId.toString() as any,
            firstName: supervisor.firstName || '',
            lastName: supervisor.lastName || '',
            isAssignable,
            activeTripsCount
          };
        })
      );
      
      return result;
    } catch (error) {
      this.logger.error('Error getting assignable supervisors:', error);
      return [];
    }
  }
}
