import { Controller } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
    GenerateGeneralReportRequest,
    type GenerateGeneralReportResponse,
    type GenerateVehicleDetailReportRequest,
    type GenerateVehicleDetailReportResponse,
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
}
