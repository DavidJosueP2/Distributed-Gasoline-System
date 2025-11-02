export interface CreateRouteResponseDto {
  id: number;
  name: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  vehicleType: string;
}
