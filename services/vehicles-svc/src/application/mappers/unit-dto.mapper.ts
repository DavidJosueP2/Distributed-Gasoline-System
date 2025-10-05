import { CreateUnitDto, UpsertUnitConsumptionDto, UpdateUnitStatusDto } from '../dto/unit-vehicle';

export const UnitDtoMapper = {
  toCreateInput(dto: CreateUnitDto) {
    return {
      modelId: BigInt(dto.modelId),
      plate: dto.plate,
      serialVin: dto.serialVin,
      tankCapacityL: dto.tankCapacityL,
      odometerKm: dto.odometerKm,
      consumption: dto.consumption ? {
        baselineOverrideLPer100Km: dto.consumption.baseline_override_l_per_100km,
      } : null,
      extraLicenses: dto.extraLicenses?.map(l => ({
        code: l.licenseTypeCode ?? undefined,
        id: l.licenseTypeId ? BigInt(l.licenseTypeId) : undefined,
      })),
    } as const;
  },
  toUpdateStatusInput(dto: UpdateUnitStatusDto & { vehicleId: string }) {
    return {
      vehicleId: BigInt(dto.vehicleId),
      newStatus: dto.newStatus,
    } as const;
  },
  toUpsertConsumptionInput(dto: UpsertUnitConsumptionDto) {
    return {
      vehicleId: BigInt(dto.vehicleId),
      baselineOverrideLPer100Km: dto.baselineOverrideLPer_100km,
    } as const;
  },
  toUpdateInput(dto: { vehicleId: string; plate?: string; tankCapacityL?: number; odometerKm?: number }) {
    return {
      vehicleId: BigInt(dto.vehicleId),
      plate: dto.plate,
      tankCapacityL: dto.tankCapacityL,
      odometerKm: dto.odometerKm,
    } as const;
  },
};
