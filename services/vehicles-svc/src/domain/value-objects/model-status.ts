export enum ModelStatus {
    ACTIVE = "ACTIVE",
    DEPRECATED = "DEPRECATED",
}

/**
 * Valida si un valor es un ModelStatus válido
 */
export function isValidModelStatus(value: unknown): value is ModelStatus {
    return typeof value === 'string' && Object.values(ModelStatus).includes(value as ModelStatus);
}

/**
 * Convierte un string a ModelStatus o lanza error
 */
export function toModelStatus(value: string): ModelStatus {
    if (isValidModelStatus(value)) {
        return value;
    }
    throw new Error(`Invalid ModelStatus: ${value}. Valid values are: ${Object.values(ModelStatus).join(', ')}`);
}

/**
 * Obtiene todos los valores válidos de ModelStatus
 */
export function getAllModelStatuses(): ModelStatus[] {
    return Object.values(ModelStatus);
}

