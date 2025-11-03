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
import {
  FuelServiceClient,
  VehicleType,
} from '../../grpc/clients/fuel-svc/fuel.client';

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
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateGeneralReport({ startDate, endDate }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/vehicle-detail')
  @GrpcTimeout(10000)
  generateVehicleDetailReport(
    @Query('vehicleType') vehicleType: VehicleType,
    @Req() req: any,
  ) {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateVehicleDetailReport({ vehicleType }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/vehicle-routes')
  @GrpcTimeout(10000)
  generateVehicleRoutesReport(
    @Query('vehicleId') vehicleId: string,
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    if (!vehicleId) {
      throw new BadRequestException('vehicleId is required');
    }

    const vehicleIdNum = Number.parseInt(vehicleId, 10);
    if (Number.isNaN(vehicleIdNum)) {
      throw new BadRequestException('vehicleId must be a valid number');
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateVehicleRoutesReport(
          { vehicleId: vehicleIdNum, status },
          req._grpcMetadata,
        ),
      ),
    );
  }
}
