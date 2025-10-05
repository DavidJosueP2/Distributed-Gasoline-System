import { EngineType } from "../value-objects/engine-type";

export interface ModelEngineSpec {
    engineType: EngineType;        // Enum tipado
    baselineLPer100km: number;     // L/100km
    displacementCc: number;
    powerHp: number;
}
