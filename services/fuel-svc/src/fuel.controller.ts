import { Controller } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
    GenerateGeneralReportRequest,
    type GenerateGeneralReportResponse,
    type GenerateVehicleDetailReportRequest,
    type GenerateVehicleDetailReportResponse,
    type GenerateVehicleRoutesReportRequest,
    type GenerateVehicleRoutesReportResponse,
    type GenerateKPIsRequest,
    type GenerateKPIsResponse,
    type GenerateDriverRankingReportRequest,
    type GenerateDriverRankingReportResponse,
    type GetDriverTripsRequest,
    type GetDriverTripsResponse,
    type GenerateRoutesSummaryReportRequest,
    type GenerateRoutesSummaryReportResponse,
} from './dto/fuel.dto';
import { Metadata } from '@grpc/grpc-js';
import { Roles } from './common/auth/decorators/roles.decorator';

@Controller()
export class FuelController {
    constructor(private readonly fuelService: FuelService) {}

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateGeneralReport')
    public async generateGeneralReport(
        data: GenerateGeneralReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateGeneralReportResponse> {
        return this.fuelService.generateGeneralReport(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateVehicleDetailReport')
    public async generateVehicleDetailReport(
        data: GenerateVehicleDetailReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleDetailReportResponse> {
        return this.fuelService.generateVehicleDetailReport(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateVehicleRoutesReport')
    public async generateVehicleRoutesReport(
        data: GenerateVehicleRoutesReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleRoutesReportResponse> {
        return this.fuelService.generateVehicleRoutesReport(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateKPIs')
    public async generateKPIs(
        data: GenerateKPIsRequest,
        metadata?: Metadata,
    ): Promise<GenerateKPIsResponse> {
        return this.fuelService.generateKPIs(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateDriverRankingReport')
    public async generateDriverRankingReport(
        data: GenerateDriverRankingReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateDriverRankingReportResponse> {
        return this.fuelService.generateDriverRankingReport(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GetDriverTrips')
    public async getDriverTrips(
        data: GetDriverTripsRequest,
        metadata?: Metadata,
    ): Promise<GetDriverTripsResponse> {
        return this.fuelService.getDriverTrips(data, metadata);
    }

    @Roles('ADMIN', 'SUPERVISOR')
    @GrpcMethod('FuelService', 'GenerateRoutesSummaryReport')
    public async generateRoutesSummaryReport(
        data: GenerateRoutesSummaryReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateRoutesSummaryReportResponse> {
        return this.fuelService.generateRoutesSummaryReport(data, metadata);
    }
}
