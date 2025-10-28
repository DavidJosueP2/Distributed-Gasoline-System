// src/application/services/trip.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { TOKENS } from '../tokens';
import { TripRepository } from '../../domain/repositories/trip.repository';
import { RouteRepository } from '../../domain/repositories/route.repository';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus, canTransitionTo } from '../../domain/value-objects/trip-status.vo';
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
  ReviewCommentRequiredException
} from '../exceptions';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TripService {
  constructor(
    @Inject(TOKENS.TripRepository)
    private readonly tripRepo: TripRepository,
    @Inject(TOKENS.RouteRepository)
    private readonly routeRepo: RouteRepository,
    private readonly grpcFactory: GrpcClientFactory,
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
      'DRIVER-MS',
      'driverms.v1',
      'driver_ms.proto',
    );
    return new DriversClient(client);
  }

  private async usersClient(): Promise<UsersClient> {
    const client = await this.grpcFactory.clientFor(
      'USERS-SERVICE',
      'users.v1',
      'users.proto',
    );
    return new UsersClient(client);
  }

  async createTrip(input: {
    routeId: bigint;
    supervisorId: bigint;
    driverId: bigint;
    vehicleId: bigint;
  }): Promise<{ id: bigint; fuelEstimated: number }> {
    // Validar que la ruta existe
    const route = await this.routeRepo.findById(input.routeId);
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }

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
        routeId: input.routeId,
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
      return { id, fuelEstimated };
    } catch (error) {
      throw new VehicleServiceUnavailableException(input.vehicleId);
    }
  }

  async getTripEnriched(id: bigint): Promise<TripEnriched> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    // Obtener información enriquecida de todos los servicios
    const [vehicleInfo, driverInfo, supervisorInfo] = await Promise.all([
      this.vehiclesClient().then(client => client.getVehicleInfo(trip.vehicleId)),
      this.driversClient().then(client => client.getDriverInfo(trip.driverId)),
      this.usersClient().then(client => client.getUserInfo(trip.supervisorId))
    ]);

    return {
      ...trip,
      vehicleInfo,
      driverInfo,
      supervisorInfo
    };
  }

  async listTrips(statusFilter?: TripStatus, driverIdFilter?: bigint): Promise<Trip[]> {
    return await this.tripRepo.findAll(statusFilter, driverIdFilter);
  }

  async updateTrip(id: bigint, input: {
    driverId?: bigint;
    vehicleId?: bigint;
  }): Promise<Trip> {
    const existingTrip = await this.tripRepo.findById(id);
    if (!existingTrip) {
      throw new NotFoundException('Viaje no encontrado');
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

  async startTrip(id: bigint): Promise<Date> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (!canTransitionTo(trip.status, TripStatus.EN_RUTA)) {
      throw new InvalidTripStatusTransitionException(trip.status, TripStatus.EN_RUTA);
    }

    const startTime = new Date();
    await this.tripRepo.update(id, {
      status: TripStatus.EN_RUTA,
      startTime,
    });

    // Actualizar status de driver y vehicle a ON_ROUTE
    try {
      const driversClient = await this.driversClient();
      const vehiclesClient = await this.vehiclesClient();
      
      await driversClient.updateDriverToOnRoute(trip.driverId);
      await vehiclesClient.updateVehicleToOnRoute(trip.vehicleId);
    } catch (error) {
      // Log error pero no fallar el viaje
      console.error('Error updating driver/vehicle status:', error);
    }

    return startTime;
  }

  async finishTrip(id: bigint, odometerEnd: number): Promise<{
    distanceKmReal: number;
    fuelActual: number;
    endTime: Date;
  }> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (trip.status !== TripStatus.EN_RUTA) {
      throw new TripNotInCorrectStatusException('EN_RUTA', trip.status);
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

    // Obtener consumo efectivo del vehículo
    try {
      const vehiclesClient = await this.vehiclesClient();
      const consumptionProfile = await vehiclesClient.getConsumptionProfile(trip.vehicleId);

      // Calcular consumo real
      const fuelActual = FuelCalculatorService.calculateActualFuel(
        consumptionProfile.effectiveLPer100km,
        distanceKmReal
      );

      const endTime = new Date();
      await this.tripRepo.update(id, {
        status: TripStatus.EN_REVISION,
        odometerEnd,
        distanceKmReal,
        fuelActual,
        endTime,
      });

      // Actualizar status de driver y vehicle a AVAILABLE/ACTIVE
      try {
        const driversClient = await this.driversClient();
        const vehiclesClient = await this.vehiclesClient();
        
        await driversClient.updateDriverToAvailable(trip.driverId);
        await vehiclesClient.updateVehicleToActive(trip.vehicleId);
      } catch (error) {
        // Log error pero no fallar el viaje
        console.error('Error updating driver/vehicle status:', error);
      }

      return { distanceKmReal, fuelActual, endTime };
    } catch (error) {
      throw new VehicleServiceUnavailableException(trip.vehicleId);
    }
  }

  async reviewTrip(id: bigint, reviewComment?: string): Promise<Date> {
    const trip = await this.tripRepo.findById(id);
    if (!trip) {
      throw new NotFoundException('Viaje no encontrado');
    }

    if (trip.status !== TripStatus.EN_REVISION) {
      throw new TripNotInCorrectStatusException('EN_REVISION', trip.status);
    }

    // Calcular desviación
    const deviationPercentage = FuelCalculatorService.calculateDeviationPercentage(
      trip.distanceKmPlanned,
      trip.distanceKmReal!
    );

    // Verificar si requiere comentario obligatorio
    if (FuelCalculatorService.requiresReviewComment(deviationPercentage) && !reviewComment?.trim()) {
      throw new ReviewCommentRequiredException(deviationPercentage);
    }

    const reviewedAt = new Date();
    await this.tripRepo.update(id, {
      status: TripStatus.TERMINADO,
      reviewComment: reviewComment?.trim() || null,
    });

    return reviewedAt;
  }
}
