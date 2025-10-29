import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import type { RegisterRealFuelConsumptionRequest } from './dto/register-real-fuel-consumption-request.dto';
import type { RegisterRealFuelConsumptionResponse } from './dto/register-real-fuel-consumption-response.dto';
import type { UpdateRealFuelConsumptionRequest } from './dto/update-real-fuel-consumption-request.dto';
import type { UpdateRealFuelConsumptionResponse } from './dto/update-real-fuel-consumption-response.dto';
import type {
  ComparisonReportRequest,
  ComparisonReportResponse,
  MachineryReportRequest,
  MachineryReportResponse,
  FuelConsumptionSummary,
  MachineryTypeReport,
  FuelRecordReport
} from './dto/fuel-consumption-report.dto';
import { FuelRecord } from './entities/fuel-record.entity';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import type { Trip } from './grpc/clients/trips-client';

// Enum para tipo de maquinaria basado en la tabla routes
export enum TipoMaquinaria {
  LIVIANO = 'LIVIANO',
  PESADO = 'PESADO',
  CUALQUIERA = 'CUALQUIERA',
}

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelRecord)
    private readonly fuelRecordRepository: Repository<FuelRecord>,
    private readonly grpcClientFactory: GrpcClientFactory,
  ) { }

  getHello(): string {
    return 'Fuel Service is running!';
  }

  public async registerRealFuelConsumption(
    data: RegisterRealFuelConsumptionRequest,
  ): Promise<RegisterRealFuelConsumptionResponse> {

    // Verificar que no exista ya un registro para ese trip
    const existingRecord = await this.fuelRecordRepository.findOne({
      where: { tripId: Number(data.tripId) },
    });

    if (existingRecord) {
      throw new ConflictException('Ya existe un registro de consumo para este viaje');
    }

    // Obtener datos del viaje desde TripsService
    const trip = await this.getTripById(data.tripId);

    // Calcular diferencia
    const difference = data.fuelReal - trip.fuelEstimated;

    // Guardar registro
    const fuelRecord = this.fuelRecordRepository.create({
      tripId: Number(data.tripId),
      fuelReal: data.fuelReal,
      difference: difference,
      observation: data.observations,
    });

    await this.fuelRecordRepository.save(fuelRecord);

    return {
      success: true,
      tripId: data.tripId,
      observations: data.observations,
    };
  }

  public async updateRealFuelConsumption(
    data: UpdateRealFuelConsumptionRequest,
  ): Promise<UpdateRealFuelConsumptionResponse> {

    // Buscar el registro existente
    const existingRecord = await this.fuelRecordRepository.findOne({
      where: { tripId: Number(data.tripId) },
    });

    if (!existingRecord) {
      throw new NotFoundException('No existe un registro de consumo para este viaje');
    }

    // Obtener datos del viaje desde TripsService
    const trip = await this.getTripById(data.tripId);

    // Calcular nueva diferencia
    const difference = data.fuelReal - trip.fuelEstimated;

    // Actualizar registro
    existingRecord.fuelReal = data.fuelReal;
    existingRecord.difference = difference;
    if (data.observations !== undefined) {
      existingRecord.observation = data.observations;
    }

    await this.fuelRecordRepository.save(existingRecord);

    return {
      success: true,
      tripId: data.tripId,
      observations: data.observations,
    };
  }

  private async getTripById(tripId: number | string): Promise<Trip> {
    // TODO: Configurar cuando exista el proto de trips
    // const tripsClient = await this.grpcClientFactory.clientFor(
    //   'TRIPS-SERVICE',
    //   'trips.v1',
    //   'trips.proto'
    // );
    // const client = tripsClient.getService<TripsServiceClient>('TripsService');
    // const trip = await client.GetTripById({ tripId }).toPromise();
    // return trip;

    // Mock temporal - asumir que el viaje existe
    // Basado en la estructura de la tabla trips
    return {
      id: Number(tripId),
      routeId: 1,
      supervisorId: 1,
      driverId: 1,
      vehicleId: 1,
      startTime: new Date().toISOString(),
      endTime: undefined,
      status: 'EN_RUTA',
      odometerStart: 1000.0,
      odometerEnd: undefined,
      distanceKmReal: undefined,
      distanceKmPlanned: 50.0,
      fuelEstimated: 25.5, // Valor más realista
      fuelActual: undefined,
      reviewComment: undefined,
      currentLat: undefined,
      currentLng: undefined,
      currentDistance: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
