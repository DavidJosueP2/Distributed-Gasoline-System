export interface RegisterRealFuelConsumptionRequest {
  tripId: number | string;
  fuelReal: number;
  observations?: string;
}
