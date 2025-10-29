export interface UpdateRealFuelConsumptionRequest {
  tripId: number | string;
  fuelReal: number;
  observations?: string;
}
