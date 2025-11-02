import { CreateUnitRequest, UpdateUnitStatusRequest, UpsertUnitConsumptionRequest, UpdateUnitRequest, VehicleUnit, VehicleUnitConsumption } from '../../clients/vehicles-svc/vehicles.client';

export class VehicleUnitsHttpMapper {
  static toCreate(src: any): CreateUnitRequest {
    // Extraer y transformar consumption si existe
    let consumption: any = undefined;
    if (src.consumption) {
      const baselineValue = src.consumption.baselineOverrideLPer_100Km
        ?? src.consumption.baselineOverrideLPer100Km
        ?? src.consumption.baseline_override_l_per_100km;

      if (baselineValue !== undefined) {
        // IMPORTANTE: El proto define "baseline_override_l_per_100km" en snake_case
        consumption = {
          baseline_override_l_per_100km: this.num(baselineValue),
        };
      }
    }

    return {
      modelId: src.modelId,
      plate: src.plate,
      serialVin: src.serialVin ?? src.serial_vin,
      tankCapacityL: this.num(src.tankCapacityL ?? src.tank_capacity_l),
      odometerKm: this.num(src.odometerKm ?? src.odometer_km),
      consumption: consumption,  // Incluir consumption en la creación
      extraLicenses: undefined,
    };
  }

  static needsConsumptionUpdate(src: any): boolean {
    const c = src?.consumption || {};
    return this.hasAny(c);
  }

  /**
   * IMPORTANTE: Protobuf requiere baselineOverrideLPer_100km (con guión bajo antes del número)
   * Acepta múltiples variantes de entrada HTTP
   */
  static toConsumption(id: string, src: any): UpsertUnitConsumptionRequest {
    return {
      vehicleId: id,
      baselineOverrideLPer_100km: this.num(
        src.baselineOverrideLPer_100km ?? src.baselineOverrideLPer100Km ?? src.baselineOverrideLPer100km ?? src.baseline_override_l_per_100km,
      ),
      calibrationK: this.num(src.calibrationK ?? src.calibration_k),
    };
  }

  static toStatus(id: string, body: any): UpdateUnitStatusRequest {
    return {
      vehicleId: id,
      newStatus: body?.newStatus || body?.status,
    };
  }

  static toUpdate(id: string, body: any): UpdateUnitRequest {
    return {
      vehicleId: id,
      plate: body?.plate ?? body?.newPlate ?? body?.new_plate,
      tankCapacityL: this.num(body?.tankCapacityL ?? body?.tank_capacity_l),
      odometerKm: this.num(body?.odometerKm ?? body?.odometer_km),
    };
  }

  /**
   * Convierte VehicleUnit de gRPC a respuesta HTTP limpia en camelCase
   */
  static toUnit(u: VehicleUnit) {
    const consumption = u.consumption ? this.toConsumptionResponse(u.consumption) : undefined;
    return {
      vehicleId: u.vehicleId,
      modelId: u.modelId,
      plate: u.plate,
      serialVin: u.serialVin,
      tankCapacityL: u.tankCapacityL,
      odometerKm: u.odometerKm,
      operationalStatus: u.operationalStatus,
      createdAt: this.toIso(u.createdAt),
      updatedAt: this.toIso(u.updatedAt),
      consumption,
    };
  }

  /**
   * Convierte VehicleUnitConsumption a respuesta HTTP limpia en camelCase
   * IMPORTANTE: gRPC envía con guion bajo (baselineModelLPer_100km) por convención Protobuf
   * pero HTTP responde en camelCase puro (baselineModelLPer100km)
   */
  static toConsumptionResponse(c: VehicleUnitConsumption) {
    return {
      baselineModelLPer100km: c.baselineModelLPer_100km,
      effectiveLPer100km: c.effectiveLPer_100km,
      baselineOverrideLPer100km: c.baselineOverrideLPer_100km,
      calibrationK: c.calibrationK,
    };
  }

  static toUnitAfterCreate(created: { vehicleId: any }, cons?: VehicleUnitConsumption) {
    return {
      vehicleId: created.vehicleId,
      consumption: cons ? this.toConsumptionResponse(cons) : undefined,
    };
  }

  static toIso(ts: any): string | undefined {
    if (!ts) return undefined;
    const secs = Number(ts.seconds ?? 0);
    return new Date(secs * 1000).toISOString();
  }

  private static num(v: any): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private static hasAny(o: any): boolean {
    return o && Object.keys(o).some(k => o[k] !== undefined && o[k] !== null && o[k] !== '');
  }

  static toGetUnitRequest(query: any) {
    const id = query.id ?? query.vehicleId ?? query.vehicle_id;
    const plate = query.plate ?? query.plateNumber ?? query.plate_number;
    const vin = query.vin ?? query.serialVin ?? query.serial_vin;

    if (id) return { vehicleId: id };
    if (plate) return { plate };
    if (vin) return { serialVin: vin };
    return {};
  }

  static toDeleteRequest(id: string) {
    return { vehicleId: id };
  }

  static toDeleteResponse(res: any) {
    const timestamp = res?.deletedAt || res?.deleted_at;
    return {
      deletedAt: this.toIso(timestamp),
    };
  }

  /**
   * Convierte GetUnitConsumptionProfileResponse de gRPC a HTTP limpio en camelCase
   * IMPORTANTE: gRPC envía con guion bajo (baselineModelLPer_100km) por convención Protobuf
   * pero HTTP responde en camelCase puro (baselineModelLPer100km)
   */
  static toConsumptionProfile(res: any) {
    return {
      vehicleId: res.vehicleId,
      baselineModelLPer100km: res.baselineModelLPer_100km,
      effectiveLPer100km: res.effectiveLPer_100km,
      baselineOverrideLPer100km: res.baselineOverrideLPer_100km,
      engineType: res.engineType, // Nuevo campo: tipo de motor
      calibrationK: res.calibrationK,
      vehicleYear: res.vehicleYear,
      odometerKm: res.odometerKm,
    };
  }
}
