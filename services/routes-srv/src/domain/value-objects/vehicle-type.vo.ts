// src/domain/value-objects/vehicle-type.vo.ts
export enum VehicleType {
  LIVIANO = 'LIVIANO',
  PESADO = 'PESADO',
  CUALQUIERA = 'CUALQUIERA'
}

export function isValidVehicleType(type: string): boolean {
  return Object.values(VehicleType).includes(type as VehicleType);
}
