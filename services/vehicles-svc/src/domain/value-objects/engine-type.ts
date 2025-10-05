export enum EngineType {
    GASOLINE = "GASOLINE",
    DIESEL   = "DIESEL",
    HYBRID   = "HYBRID",
}

/**
 * Valida si un valor es un EngineType válido
 */
export function isValidEngineType(value: unknown): value is EngineType {
    return typeof value === 'string' && Object.values(EngineType).includes(value as EngineType);
}

/**
 * Convierte un string a EngineType o lanza error
 */
export function toEngineType(value: string): EngineType {
    if (isValidEngineType(value)) {
        return value;
    }
    throw new Error(`Invalid EngineType: ${value}. Valid values are: ${Object.values(EngineType).join(', ')}`);
}

/**
 * Obtiene todos los valores válidos de EngineType
 */
export function getAllEngineTypes(): EngineType[] {
    return Object.values(EngineType);
}
