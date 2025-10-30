import { Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

export interface VehicleInfo {
  id: number;
  plate: string;
  brand: string;
  family: string;
  year: number;
  requiredLicenses?: string[];
}

export interface ConsumptionProfile {
  vehicleId: number;
  effectiveLPer100km: number;
  baselineModelLPer100km: number;
  calibrationK: number;
}

export interface VehicleUnitResponse {
  unit: {
    vehicleId: number;
    plate: string;
    odometerKm: number;
    model: {
      brand: string;
      family: string;
      yearFrom: number;
    };
  };
}

export interface ConsumptionProfileResponse {
  vehicleId: number;
  effectiveLPer_100km: number;
  baselineModelLPer_100km: number;
  calibrationK: number;
}

export interface VehiclesServiceClient {
  GetUnit(data: { vehicleId: number }): Observable<VehicleUnitResponse>;
  GetUnitConsumptionProfile(data: { vehicleId: number }): Observable<ConsumptionProfileResponse>;
  UpdateUnitStatus(data: { vehicleId: number; newStatus: string }): Observable<any>;
}

@Injectable()
export class VehiclesClient {
  private vehiclesService: VehiclesServiceClient;

  constructor(private readonly client: ClientGrpc) {
    this.vehiclesService = this.client.getService<VehiclesServiceClient>('VehiclesService');
  }

  async getVehicleInfo(vehicleId: bigint): Promise<VehicleInfo> {
    const response = await lastValueFrom(
      this.vehiclesService.GetUnit({ vehicleId: Number(vehicleId) })
    );
    
    return {
      id: response.unit.vehicleId,
      plate: response.unit.plate,
      brand: response.unit.model.brand,
      family: response.unit.model.family,
      year: response.unit.model.yearFrom,
      requiredLicenses: [], // Por ahora vacío, se implementará cuando el servicio de vehículos lo soporte
    };
  }

  async getVehicleOdometer(vehicleId: bigint): Promise<number> {
    const response = await lastValueFrom(
      this.vehiclesService.GetUnit({ vehicleId: Number(vehicleId) })
    );
    
    return response.unit.odometerKm;
  }

  async getConsumptionProfile(vehicleId: bigint): Promise<ConsumptionProfile> {
    const response = await lastValueFrom(
      this.vehiclesService.GetUnitConsumptionProfile({ vehicleId: Number(vehicleId) })
    );
    
    return {
      vehicleId: response.vehicleId,
      effectiveLPer100km: response.effectiveLPer_100km,
      baselineModelLPer100km: response.baselineModelLPer_100km,
      calibrationK: response.calibrationK,
    };
  }

  async updateVehicleToOnRoute(vehicleId: bigint): Promise<any> {
    return lastValueFrom(
      this.vehiclesService.UpdateUnitStatus({
        vehicleId: Number(vehicleId),
        newStatus: 'ON_ROUTE',
      })
    );
  }

  async updateVehicleToActive(vehicleId: bigint): Promise<any> {
    return lastValueFrom(
      this.vehiclesService.UpdateUnitStatus({
        vehicleId: Number(vehicleId),
        newStatus: 'ACTIVE',
      })
    );
  }
}