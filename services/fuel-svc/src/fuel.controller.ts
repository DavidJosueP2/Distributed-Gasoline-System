import { Controller } from '@nestjs/common';
import { FuelService } from './fuel.service';
import { GrpcMethod } from '@nestjs/microservices';
import { Public } from './common/auth/decorators/public.decorator';
import type { RegisterRealFuelConsumptionRequest } from './dto/register-real-fuel-consumption-request.dto';
import type { RegisterRealFuelConsumptionResponse } from './dto/register-real-fuel-consumption-response.dto';
import type { UpdateRealFuelConsumptionRequest } from './dto/update-real-fuel-consumption-request.dto';
import type { UpdateRealFuelConsumptionResponse } from './dto/update-real-fuel-consumption-response.dto';
import type {
  ComparisonReportRequest,
  ComparisonReportResponse,
  MachineryReportRequest,
  MachineryReportResponse
} from './dto/fuel-consumption-report.dto';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class FuelController {
  constructor(private readonly fuelService: FuelService) { }

  @Public()
  @GrpcMethod('FuelService', 'GetFuel')
  public getFuel(): string {
    return this.fuelService.getHello();
  }

  @GrpcMethod('FuelService', 'RegisterRealFuelConsumption')
  public async registerRealFuelConsumption(
    data: RegisterRealFuelConsumptionRequest,
    metadata?: Metadata,
  ): Promise<RegisterRealFuelConsumptionResponse> {
    return this.fuelService.registerRealFuelConsumption(data);
  }

  @GrpcMethod('FuelService', 'UpdateRealFuelConsumption')
  public async updateRealFuelConsumption(
    data: UpdateRealFuelConsumptionRequest,
    metadata?: Metadata,
  ): Promise<UpdateRealFuelConsumptionResponse> {
    return this.fuelService.updateRealFuelConsumption(data);
  }

}
