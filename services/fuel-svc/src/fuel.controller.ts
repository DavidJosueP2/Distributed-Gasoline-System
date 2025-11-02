import { Controller } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { GrpcMethod } from '@nestjs/microservices';
import type {
    GenerateGeneralReportRequest,
    GenerateGeneralReportResponse,
    GenerateVehicleDetailReportRequest,
    GenerateVehicleDetailReportResponse,
} from './dto/fuel.dto';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class FuelController {
    constructor(private readonly fuelService: FuelService) {}

    @GrpcMethod('FuelService', 'GenerateGeneralReport')
    public async generateGeneralReport(
        data: GenerateGeneralReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateGeneralReportResponse> {
        return this.fuelService.generateGeneralReport(data, metadata);
    }

    @GrpcMethod('FuelService', 'GenerateVehicleDetailReport')
    public async generateVehicleDetailReport(
        data: GenerateVehicleDetailReportRequest,
        metadata?: Metadata,
    ): Promise<GenerateVehicleDetailReportResponse> {
        return this.fuelService.generateVehicleDetailReport(data, metadata);
    }
}
