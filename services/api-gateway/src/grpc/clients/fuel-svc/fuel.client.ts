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
}

export interface GenerateVehicleDetailReportRequest {
  startDate: string;
  endDate: string;
  machineType: 'LIGHT' | 'HEAVY';
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

export interface FuelServiceClient {
  GenerateGeneralReport(
    data: GenerateGeneralReportRequest,
    metadata?: any,
  ): Observable<GenerateGeneralReportResponse>;

  GenerateVehicleDetailReport(
    data: GenerateVehicleDetailReportRequest,
    metadata?: any,
  ): Observable<GenerateVehicleDetailReportResponse>;
}
