import {
  Controller,
  Get,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { from, switchMap } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { FuelServiceClient } from '../../grpc/clients/fuel-svc/fuel.client';

@Controller('fuel')
export class FuelHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<FuelServiceClient> {
    const appName = process.env.FUEL_APP_NAME || 'FUEL-SERVICE';
    const client = await this.factory.forService(appName, 'fuel', 'fuel.proto');
    return client.getService<FuelServiceClient>('FuelService');
  }

  @Get('reports/general')
  @GrpcTimeout(10000)
  generateGeneralReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateGeneralReport({ startDate, endDate }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/vehicle-detail')
  @GrpcTimeout(10000)
  generateVehicleDetailReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('machineType') machineType: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate || !machineType) {
      throw new BadRequestException(
        'startDate, endDate and machineType are required',
      );
    }

    if (machineType !== 'LIGHT' && machineType !== 'HEAVY') {
      throw new BadRequestException('machineType must be LIGHT or HEAVY');
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateVehicleDetailReport(
          { startDate, endDate, machineType },
          req._grpcMetadata,
        ),
      ),
    );
  }
}
