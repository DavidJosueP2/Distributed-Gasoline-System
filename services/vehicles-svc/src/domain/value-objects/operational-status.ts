export enum OperationalStatus {
    ACTIVE = "ACTIVE",
    MAINTENANCE = "MAINTENANCE",
    RETIRED = "RETIRED",
    ON_ROUTE = "ON_ROUTE",
}

/**
 * Valida si un valor es un OperationalStatus válido
 */
export function isValidOperationalStatus(value: unknown): value is OperationalStatus {
    return typeof value === 'string' && Object.values(OperationalStatus).includes(value as OperationalStatus);
}

/**
 * Convierte un string a OperationalStatus o lanza error
 */
export function toOperationalStatus(value: string): OperationalStatus {
    if (isValidOperationalStatus(value)) {
        return value;
    }
    throw new Error(`Invalid OperationalStatus: ${value}. Valid values are: ${Object.values(OperationalStatus).join(', ')}`);
}

/**
 * Obtiene todos los valores válidos de OperationalStatus
 */
export function getAllOperationalStatuses(): OperationalStatus[] {
    return Object.values(OperationalStatus);
}
