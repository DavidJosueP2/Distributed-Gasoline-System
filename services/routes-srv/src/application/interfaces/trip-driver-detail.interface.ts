/**
 * Interfaz específica para los detalles de viajes de un conductor
 * Solo incluye los campos esenciales para mostrar en la vista de driver trips
 */
export interface TripDriverDetail {
  // Información esencial del viaje
  id: bigint;
  startTime: Date | null;
  endTime: Date | null;
  status: string;
  fuelEstimated: number;
  fuelActual: number | null;

  // Información del vehículo (solo placa)
  vehiclePlate: string;

  // Información de la ruta
  originName: string;
  destinationName: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}
