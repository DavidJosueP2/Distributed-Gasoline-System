// src/domain/value-objects/trip-status.vo.ts
export enum TripStatus {
  CREADO = 'CREADO',
  EN_RUTA = 'EN_RUTA', 
  EN_REVISION = 'EN_REVISION',
  TERMINADO = 'TERMINADO'
}

export function isValidTripStatus(status: string): boolean {
  return Object.values(TripStatus).includes(status as TripStatus);
}

export function canTransitionTo(from: TripStatus, to: TripStatus): boolean {
  const validTransitions: Record<TripStatus, TripStatus[]> = {
    [TripStatus.CREADO]: [TripStatus.EN_RUTA],
    [TripStatus.EN_RUTA]: [TripStatus.EN_REVISION],
    [TripStatus.EN_REVISION]: [TripStatus.TERMINADO],
    [TripStatus.TERMINADO]: [] // Estado final
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}
