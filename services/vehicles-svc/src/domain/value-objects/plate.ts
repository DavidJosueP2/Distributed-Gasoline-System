declare const __plateBrand: unique symbol;
export type Plate = string & { readonly [__plateBrand]: "Plate" };

const PLATE_REGEX = /^[A-Z0-9-]{3,15}$/;

export function createPlate(raw: string): Plate {
  if (raw == null) throw new Error('Plate requerido');
  const norm = raw.trim().toUpperCase();
  if (!PLATE_REGEX.test(norm)) throw new Error('Plate inválida');
  return norm as Plate;
}

export function isPlate(p: any): p is Plate {
  return typeof p === 'string' && PLATE_REGEX.test(p);
}