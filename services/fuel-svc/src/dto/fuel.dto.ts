// ===========================================
// DTOs for reports
// ===========================================

export interface GenerateGeneralReportRequest {
    startDate: string;
    endDate: string;
}

export interface GenerateGeneralReportResponse {
    LIGHT: VehicleSummaryGeneralReport;
    HEAVY: VehicleSummaryGeneralReport;
    ANY: VehicleSummaryGeneralReport;
}

export interface VehicleSummaryGeneralReport {
    estimated: number;
    actual: number;
}

export interface FuelSummaryAccumulator {
    estimated: number;
    actual: number;
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
