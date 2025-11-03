// ===========================================
// DTOs for reports
// ===========================================

import { IsDateString, IsNotEmpty, Validate } from 'class-validator';
import { IsStartDateBeforeEndDateConstraint } from './validators';

export class GenerateGeneralReportRequest {
    @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
    @IsDateString(
        {},
        {
            message:
                'La fecha de inicio debe tener un formato de fecha válido (YYYY-MM-DD)',
        },
    )
    startDate: string;

    @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
    @IsDateString(
        {},
        {
            message:
                'La fecha de fin debe tener un formato de fecha válido (YYYY-MM-DD)',
        },
    )
    @Validate(IsStartDateBeforeEndDateConstraint)
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

export interface GenerateVehicleDetailReportRequest {
    vehicleType: VehicleType;
}

export enum VehicleType {
    VEHICLE_TYPE_UNSPECIFIED = 0,
    LIVIANO = 1,
    PESADO = 2,
    CUALQUIERA = 3,
}

export interface GenerateVehicleDetailReportResponse {
    vehicles: VehicleDetailSummary[];
}

export interface VehicleDetailSummary {
    vehicleId: number;
    trips: number;
    estimated: number;
    actual: number;
    difference: number;
    efficiency: number;
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
    //deviation: number;
}
