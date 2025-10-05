import { CreateModelRequest, UpdateModelRequest, ModelStatus, MachineType, EngineType } from '../clients/vehicles.client';

/**
 * Helper para convertir string a ModelStatus enum
 */
function toModelStatus(val: any): ModelStatus | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).toUpperCase();

  switch (str) {
    case 'ACTIVE':
      return ModelStatus.ACTIVE;
    case 'DEPRECATED':
      return ModelStatus.DEPRECATED;
    case 'MODEL_STATUS_UNSPECIFIED':
      return ModelStatus.MODEL_STATUS_UNSPECIFIED;
    default:
      // Si es un número, verificar que sea válido
      const num = Number(val);
      if (Number.isFinite(num) && Object.values(ModelStatus).includes(num)) {
        return num as ModelStatus;
      }
      return undefined;
  }
}

/**
 * Helper para convertir string a MachineType enum
 */
function toMachineType(val: any): MachineType | undefined {
  if (val === undefined || val === null) return undefined;
  const str = String(val).toUpperCase();

  switch (str) {
    case 'LIGHT':
      return MachineType.LIGHT;
    case 'HEAVY':
      return MachineType.HEAVY;
    case 'MACHINE_TYPE_UNSPECIFIED':
      return MachineType.MACHINE_TYPE_UNSPECIFIED;
    default:
      // Si es un número, verificar que sea válido
      const num = Number(val);
      if (Number.isFinite(num) && Object.values(MachineType).includes(num)) {
        return num as MachineType;
      }
      return undefined;
  }
}

/**
 * Helper para convertir string a EngineType enum
 */
function toEngineType(val: any): EngineType {
  if (val === undefined || val === null) return EngineType.GASOLINE;
  const str = String(val).toUpperCase();

  switch (str) {
    case 'GASOLINE':
      return EngineType.GASOLINE;
    case 'DIESEL':
      return EngineType.DIESEL;
    case 'HYBRID':
      return EngineType.HYBRID;
    case 'ENGINE_TYPE_UNSPECIFIED':
      return EngineType.ENGINE_TYPE_UNSPECIFIED;
    default:
      // Si es un número, verificar que sea válido
      const num = Number(val);
      if (Number.isFinite(num) && Object.values(EngineType).includes(num)) {
        return num as EngineType;
      }
      return EngineType.GASOLINE;
  }
}

/**
 * Mapper utilitario para transformar el body crudo HTTP en el request gRPC CreateModel.
 * IMPORTANTE: Protobuf requiere baselineLPer_100km (con guión bajo antes del número).
 * Acepta variantes de entrada: baselineLPer100km | baselineLPer_100km | baseline_l_per_100km.
 */
export class VehiclesHttpToGrpcMapper {
  static toCreateModel(src: any): CreateModelRequest {
    const engSrc = src?.engine || {};

    // Aceptar múltiples variantes de entrada para baseline
    const baseline = engSrc.baselineLPer_100km
      ?? engSrc.baselineLPer100km
      ?? engSrc.baseline_l_per_100km
      ?? engSrc.baselineLPer100Km;

    return {
      brand: str(src.brand),
      family: str(src.family),
      trim: optStr(src.trim),
      yearFrom: num(src.yearFrom),
      yearTo: src.yearTo == null || src.yearTo === '' ? 0 : num(src.yearTo),
      machineType: toMachineType(src.machineType) ?? MachineType.LIGHT,
      engine: {
        engineType: toEngineType(engSrc.engineType),
        baselineLPer_100km: baseline, // Protobuf requiere _ antes del número
        displacementCc: optNum(engSrc.displacementCc ?? engSrc.displacement_cc),
        powerHp: optNum(engSrc.powerHp ?? engSrc.power_hp),
      },
      defaultLicenses: Array.isArray(src.defaultLicenses)
        ? src.defaultLicenses.map((l: any) => ({
            licenseTypeCode: l.licenseTypeCode || l.license_type_code || l.code,
            licenseTypeId: l.licenseTypeId != null ? Number(l.licenseTypeId) : undefined,
          }))
        : undefined,
      idempotencyKey: optStr(src.idempotencyKey || src.idempotency_key),
    };
  }

  static toUpdateModel(id: string, src: any): UpdateModelRequest {
    const pick = (k: string, ...alts: string[]) => {
      for (const key of [k, ...alts]) if (src[key] !== undefined) return src[key];
      return undefined;
    };
    const normStr = (v: any) => (v === undefined || v === null ? undefined : String(v));
    const numOr = (v: any) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v); return Number.isFinite(n) ? n : undefined;
    };

    const statusRaw = pick('status');
    const status = toModelStatus(statusRaw);

    const brand = normStr(pick('brand'));
    const family = normStr(pick('family'));
    const trimRaw = pick('trim');
    const trim = trimRaw === '' ? '' : normStr(trimRaw);
    const yearFrom = numOr(pick('yearFrom','year_from'));
    const yearTo = numOr(pick('yearTo','year_to'));

    const machineTypeRaw = pick('machineType','machine_type');
    const machineType = toMachineType(machineTypeRaw);

    const expectedVersion = numOr(pick('expectedVersion','expected_version'));

    // Mapear el campo engine si está presente
    let engine: any = undefined;
    if (src.engine !== undefined && src.engine !== null) {
      const engSrc = src.engine;

      // Aceptar múltiples variantes de entrada para baseline
      const baseline = engSrc.baselineLPer_100km
        ?? engSrc.baselineLPer100km
        ?? engSrc.baseline_l_per_100km
        ?? engSrc.baselineLPer100Km;

      engine = {
        engineType: engSrc.engineType !== undefined ? toEngineType(engSrc.engineType) : undefined,
        baselineLPer_100km: baseline !== undefined ? Number(baseline) : undefined,
        displacementCc: engSrc.displacementCc !== undefined ? Number(engSrc.displacementCc) : (engSrc.displacement_cc !== undefined ? Number(engSrc.displacement_cc) : undefined),
        powerHp: engSrc.powerHp !== undefined ? Number(engSrc.powerHp) : (engSrc.power_hp !== undefined ? Number(engSrc.power_hp) : undefined),
      };
    }

    return {
      modelId: id,
      expectedVersion: expectedVersion,
      status,
      yearTo: yearTo === undefined ? undefined : (yearTo ?? undefined),
      brand,
      family,
      trim,
      yearFrom,
      machineType,
      engine,
    };
  }

  /**
   * Convierte VehicleModel de gRPC a respuesta HTTP limpia en camelCase
   */
  static toModelResponse(model: any) {
    if (!model) return null;

    return {
      modelId: model.modelId,
      brand: model.brand,
      family: model.family,
      trim: model.trim || undefined,
      yearFrom: model.yearFrom,
      yearTo: model.yearTo === 0 ? undefined : model.yearTo,
      machineType: model.machineType,
      status: model.status,
      createdAt: toIso(model.createdAt),
      updatedAt: toIso(model.updatedAt),
    };
  }

  /**
   * Convierte GetModelResponse de gRPC a respuesta HTTP limpia en camelCase
   */
  static toGetModelResponse(res: any) {
    if (!res) return null;

    const model = this.toModelResponse(res.model);
    const engine = res.engine ? {
      engineType: res.engine.engineType,
      baselineLPer100km: res.engine.baselineLPer_100km, // gRPC con _ → HTTP sin _
      displacementCc: res.engine.displacementCc || undefined,
      powerHp: res.engine.powerHp || undefined,
    } : undefined;

    return {
      ...model,
      engine,
      defaultLicenses: res.defaultLicenses || [],
    };
  }

  /**
   * Convierte lista de modelos de gRPC a respuesta HTTP limpia en camelCase
   */
  static toListModelsResponse(models: any[]) {
    return models.map(m => this.toModelResponse(m));
  }
}

function toIso(ts: any): string | undefined {
  if (!ts) return undefined;
  const secs = Number(ts.seconds ?? 0);
  return new Date(secs * 1000).toISOString();
}

function firstNumber(candidates: any[]): number | undefined {
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
function str(v: any): string { return v == null ? '' : String(v); }
function optStr(v: any): string | undefined { return v == null || v === '' ? undefined : String(v); }
function num(v: any): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function optNum(v: any): number | undefined { if (v == null || v === '') return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }
