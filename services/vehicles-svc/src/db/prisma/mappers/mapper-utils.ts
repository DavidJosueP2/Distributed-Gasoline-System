/**
 * Utilidades para mappers de Prisma
 */

/**
 * Elimina todas las propiedades con valor undefined de un objeto
 * Útil para preparar datos antes de pasarlos a Prisma
 */
export function pruneUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Verifica si un objeto está vacío (sin propiedades)
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Convierte un valor opcional a obligatorio con un valor por defecto
 */
export function withDefault<T>(value: T | undefined | null, defaultValue: T): T {
  return value ?? defaultValue;
}

