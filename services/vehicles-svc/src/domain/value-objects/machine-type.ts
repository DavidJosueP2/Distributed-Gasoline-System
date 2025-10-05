export enum MachineType {
    LIGHT = "LIGHT",
    HEAVY = "HEAVY",
}

/**
 * Valida si un valor es un MachineType válido
 */
export function isValidMachineType(value: unknown): value is MachineType {
    return typeof value === 'string' && Object.values(MachineType).includes(value as MachineType);
}

/**
 * Convierte un string a MachineType o lanza error
 */
export function toMachineType(value: string): MachineType {
    if (isValidMachineType(value)) {
        return value;
    }
    throw new Error(`Invalid MachineType: ${value}. Valid values are: ${Object.values(MachineType).join(', ')}`);
}

/**
 * Obtiene todos los valores válidos de MachineType
 */
export function getAllMachineTypes(): MachineType[] {
    return Object.values(MachineType);
}
