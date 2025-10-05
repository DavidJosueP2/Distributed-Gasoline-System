export interface UnitConsumptionSpecs {
    vehicleId: string;                  // FK a VehicleUnit.id
    baselineOverrideLPer100Km: number;  // obligatorio - override del baseline del modelo
    calibrationK: number;               // multiplicador calculado automáticamente (default 1.0)
    updatedAt?: Date;                   // metadato opcional
    modelBaselineLPer100Km?: number;    // baseline proveniente del modelo (para referencia)
    engineType?: string;                // tipo de motor del modelo (GASOLINE | DIESEL | HYBRID)
}
