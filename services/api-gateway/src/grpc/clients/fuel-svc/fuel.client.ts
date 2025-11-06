import { Observable } from 'rxjs';

export interface VehicleSummary {
  estimated: number;
  actual: number;
}

export interface GenerateGeneralReportRequest {
  startDate: string;
  endDate: string;
}

export interface GenerateGeneralReportResponse {
  LIGHT: VehicleSummary;
  HEAVY: VehicleSummary;
  ANY: VehicleSummary;
}

export interface GenerateVehicleDetailReportRequest {
  vehicleType: VehicleType;
}

export enum VehicleType {
  VEHICLE_TYPE_UNSPECIFIED = 0,
  LIVIANO = 1,
  PESADO = 2,
  CUALQUIERA = 3,
}

export interface VehicleDetailSummary {
  vehicleId: number;
  vehiclePlate: string;
  trips: number;
  estimated: number;
  actual: number;
  difference: number;
  efficiency: number;
}

export interface GenerateVehicleDetailReportResponse {
  vehicles: VehicleDetailSummary[];
}

export interface GenerateVehicleRoutesReportRequest {
  vehicleId: number;
  status?: string; // CREADO, EN_RUTA, EN_REVISION, TERMINADO
  vehicleType?: VehicleType; // LIVIANO, PESADO, CUALQUIERA
}

export interface GenerateVehicleRoutesReportResponse {
  routes: RouteDetailSummary[];
}

export interface RouteDetailSummary {
  routeId: number;
  routeName: string;
  originName: string;
  destinationName: string;
  estimated: number;
  actual: number;
  difference: number;
  //deviation: number; // porcentaje de desviación
  trips: TripDetail[];
}

export interface TripDetail {
  id: number;
  fuelEstimated: number;
  fuelActual?: number;
  difference: number;
  startTime: string;
  endTime: string;
  driverFirstName: string;
  driverLastName: string;
}

export interface GenerateKPIsRequest {
  statusFilter?: string; // opcional: CREADO, EN_RUTA, EN_REVISION, TERMINADO
}

export interface GenerateKPIsResponse {
  totalTrips: number;
  averageEfficiency: number; // eficiencia promedio
}

export interface GenerateDriverRankingReportRequest {
  statusFilter?: string; // opcional: CREADO, EN_RUTA, EN_REVISION, TERMINADO
}

export interface DriverRankingSummary {
  driverId: number;
  driverFirstName: string;
  driverLastName: string;
  totalTrips: number;
  tripsCreados: number;
  tripsEnRuta: number;
  tripsEnRevision: number;
  tripsTerminados: number;
}

export interface GenerateDriverRankingReportResponse {
  drivers: DriverRankingSummary[];
}

export interface GetDriverTripsRequest {
  driverId: number;
}

export interface DriverTripDetail {
  tripId: number;
  vehicle: string; // placa del vehículo
  status: string; // EN_RUTA o TERMINADO
  startTime: string; // formato: DD/MM HH:mm
  endTime: string; // formato: DD/MM HH:mm (vacío si no ha terminado)
  fuelEstimated: number; // litros estimados
  fuelActual: number; // litros reales (0 si no está disponible)
  // Coordenadas de la ruta
  originName: string;
  destinationName: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

export interface GetDriverTripsResponse {
  trips: DriverTripDetail[];
}

export interface GenerateRoutesSummaryReportRequest {
  // Por el momento sin parámetros
}

export interface RouteSummary {
  routeId: number;
  routeName: string; // formato: "Origen → Destino"
  totalTrips: number;
  estimated: number; // consumo estimado en litros
  actual: number; // consumo real en litros
  difference: number; // diferencia en litros
  efficiency: number; // eficiencia en porcentaje
}

export interface GenerateRoutesSummaryReportResponse {
  routes: RouteSummary[];
}

export interface FuelServiceClient {
  GenerateGeneralReport(
    data: GenerateGeneralReportRequest,
    metadata?: any,
  ): Observable<GenerateGeneralReportResponse>;

  GenerateVehicleDetailReport(
    data: GenerateVehicleDetailReportRequest,
    metadata?: any,
  ): Observable<GenerateVehicleDetailReportResponse>;

  GenerateVehicleRoutesReport(
    data: GenerateVehicleRoutesReportRequest,
    metadata?: any,
  ): Observable<GenerateVehicleRoutesReportResponse>;

  GenerateKPIs(
    data: GenerateKPIsRequest,
    metadata?: any,
  ): Observable<GenerateKPIsResponse>;

  GenerateDriverRankingReport(
    data: GenerateDriverRankingReportRequest,
    metadata?: any,
  ): Observable<GenerateDriverRankingReportResponse>;

  GetDriverTrips(
    data: GetDriverTripsRequest,
    metadata?: any,
  ): Observable<GetDriverTripsResponse>;

  GenerateRoutesSummaryReport(
    data: GenerateRoutesSummaryReportRequest,
    metadata?: any,
  ): Observable<GenerateRoutesSummaryReportResponse>;
}
