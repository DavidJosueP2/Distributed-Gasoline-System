import { Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

export interface VehicleInfo {
  id: number;
  plate: string;
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
  };
}

export interface ConsumptionProfileResponse {
  vehicleId: number;
  effectiveLPer_100km: number;
  baselineModelLPer_100km: number;
  calibrationK: number;
}

export interface VehiclesServiceClient {
  ListUnits(data?: any): Observable<any>;
  ListUnitsWithDetails(data?: any): Observable<any>;
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
    console.log(`[VehiclesClient] Actualizando vehicle ${vehicleId} a ACTIVE...`);
    const result = await lastValueFrom(
      this.vehiclesService.UpdateUnitStatus({
        vehicleId: Number(vehicleId),
        newStatus: 'ACTIVE',
      })
    );
    console.log(`[VehiclesClient] Vehicle ${vehicleId} actualizado exitosamente:`, result);
    return result;
  }
  
  async getAllVehicles(): Promise<any[]> {
    const response = await lastValueFrom(this.vehiclesService.ListUnits({}));
    return response.units || [];
  }

  async getAllVehiclesWithDetails(filters?: {
    licenseTypeCodes?: string[];
    machineTypeFilter?: number; // 1 = LIGHT, 2 = HEAVY
  }): Promise<any[]> {
    // Enviar en camelCase - NestJS transformará automáticamente a snake_case para gRPC
    const request: any = {};
    if (filters?.licenseTypeCodes && filters.licenseTypeCodes.length > 0) {
      request.licenseTypeCodesFilter = filters.licenseTypeCodes;
    }
    if (filters?.machineTypeFilter) {
      request.machineTypeFilter = filters.machineTypeFilter;
    }
    const response = await lastValueFrom(this.vehiclesService.ListUnitsWithDetails(request));
    
    // El proto devuelve required_licenses en snake_case como array de LicenseRef
    // Mapear a un formato consistente para uso interno
    const units = (response.units || []).map((unit: any) => {
      // Manejar ambos casos: snake_case (desde proto) y camelCase (si viene mapeado)
      const requiredLicenses = unit.required_licenses || unit.requiredLicenses || [];
      // Extraer los códigos de licencia de LicenseRef (puede venir como license_type_code o licenseTypeCode)
      const licenseCodes = requiredLicenses.map((ref: any) => 
        ref.license_type_code || ref.licenseTypeCode || ''
      ).filter((code: string) => code !== '');
      
      return {
        ...unit,
        unit: unit.unit || {},
        requiredLicenses: licenseCodes, // Formato consistente para uso interno
        machineType: unit.machine_type || unit.machineType
      };
    });
    
    return units;
  }
}