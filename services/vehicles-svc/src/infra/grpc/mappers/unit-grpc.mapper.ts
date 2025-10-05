import { VehicleUnit } from '../../../domain';

function ts(d?: Date) {
  if (!d) return undefined;
  const ms = d.getTime();
  return { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 };
}

function mapOperationalStatus(s: string | undefined) {
  if (s === 'ACTIVE') return 1;
  if (s === 'MAINTENANCE') return 2;
  if (s === 'RETIRED') return 3;
  if (s === 'ON_ROUTE') return 4;
  return 0; // unspecified
}

function mapEngineType(engineType?: string) {
  if (engineType === 'GASOLINE') return 1;
  if (engineType === 'DIESEL') return 2;
  if (engineType === 'HYBRID') return 3;
  return 0; // unspecified
}

export class GrpcUnitMapper {
  /**
   * Mapea VehicleUnit del dominio a Protobuf.
   * IMPORTANTE: Protobuf serializa a JSON con guion bajo antes de números:
   * Proto: baseline_model_l_per_100km → JSON: baselineModelLPer_100km
   */
  static toProto(u: VehicleUnit) {
    const baselineModel = u.consumption?.modelBaselineLPer100Km ?? 0;
    const baselineOverride = u.consumption?.baselineOverrideLPer100Km ?? 0;
    const calibrationK = u.consumption?.calibrationK ?? 1;
    // effective = (override ?? baseline_model) * calibration_k
    const baselineToUse = baselineOverride > 0 ? baselineOverride : baselineModel;
    const effective = baselineToUse * calibrationK;

    return {
      vehicleId: Number(u.id),
      modelId: Number(u.modelId),
      plate: u.plate,
      serialVin: u.serialVin ?? '',
      operationalStatus: mapOperationalStatus(u.operationalStatus as any),
      tankCapacityL: u.tankCapacityL ?? 0,
      odometerKm: u.odometerKm ?? 0,
      createdAt: ts(u.createdAt),
      updatedAt: ts(u.updatedAt),
      consumption: u.consumption ? {
        baselineModelLPer_100km: baselineModel,
        calibrationK: calibrationK,
        effectiveLPer_100km: effective,
        baselineOverrideLPer_100km: baselineOverride,
      } : undefined,
    };
  }

  static toConsumptionProto(u: VehicleUnit) {
    const baselineModel = u.consumption?.modelBaselineLPer100Km ?? 0;
    const baselineOverride = u.consumption?.baselineOverrideLPer100Km ?? 0;
    const calibrationK = u.consumption?.calibrationK ?? 1;
    // effective = (override ?? baseline_model) * calibration_k
    const baselineToUse = baselineOverride > 0 ? baselineOverride : baselineModel;
    const effective = baselineToUse * calibrationK;

    return {
      baselineModelLPer_100km: baselineModel,
      calibrationK: calibrationK,
      effectiveLPer_100km: effective,
      baselineOverrideLPer_100km: baselineOverride,
    };
  }

  static toConsumptionProfileProto(profile: {
    vehicleId: bigint;
    baselineModelLPer100km: number;
    calibrationK: number;
    effectiveLPer100km: number;
    baselineOverrideLPer100km: number;
    engineType?: string;
    vehicleYear: number;
    odometerKm: number;
  }) {
    return {
      vehicleId: Number(profile.vehicleId),
      baselineModelLPer_100km: profile.baselineModelLPer100km,
      calibrationK: profile.calibrationK,
      effectiveLPer_100km: profile.effectiveLPer100km,
      baselineOverrideLPer_100km: profile.baselineOverrideLPer100km,
      engineType: mapEngineType(profile.engineType),
      vehicleYear: profile.vehicleYear,
      odometerKm: profile.odometerKm,
    };
  }
}
