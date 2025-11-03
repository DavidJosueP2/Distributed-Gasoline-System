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
}

export interface RouteDetailSummary {
  routeId: number;
  routeName: string;
  originName: string;
  destinationName: string;
  estimated: number;
  actual: number;
  difference: number;
  deviation: number; // porcentaje de desviación
}

export interface GenerateVehicleRoutesReportResponse {
  routes: RouteDetailSummary[];
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
}
