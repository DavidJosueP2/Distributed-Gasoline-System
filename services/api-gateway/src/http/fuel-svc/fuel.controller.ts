import {
  Controller,
  Get,
  Req,
  Query,
  Param,
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
  @GrpcTimeout(30000)
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
  @GrpcTimeout(30000)
  generateVehicleDetailReport(
    @Query('vehicleType') vehicleType: VehicleType, // Este si corresponde al tipo de vehiculo espeardo
    @Req() req: any,
  ) {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateVehicleDetailReport({ vehicleType }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/vehicle-routes')
  @GrpcTimeout(30000)
  generateVehicleRoutesReport(
    @Query('vehicleId') vehicleId: string,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('vehicleType') vehicleType?: VehicleType, // En realidad esto corresponde al tipo de vehiculo permitido en la ruta.
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
          { vehicleId: vehicleIdNum, status, vehicleType },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Get('kpis')
  @GrpcTimeout(30000)
  generateKPIs(@Req() req: any, @Query('status') status?: string) {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateKPIs({ statusFilter: status }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/driver-ranking')
  @GrpcTimeout(30000)
  generateDriverRankingReport(
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateDriverRankingReport(
          { statusFilter: status },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Get('drivers/:driverId/trips')
  @GrpcTimeout(30000)
  getDriverTrips(@Param('driverId') driverId: string, @Req() req: any) {
    const driverIdNum = Number.parseInt(driverId, 10);
    if (Number.isNaN(driverIdNum)) {
      throw new BadRequestException('driverId must be a valid number');
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GetDriverTrips({ driverId: driverIdNum }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/routes-summary')
  @GrpcTimeout(30000)
  generateRoutesSummaryReport(@Req() req: any) {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateRoutesSummaryReport({}, req._grpcMetadata),
      ),
    );
  }

  @Get('routes/:routeId/trips')
  @GrpcTimeout(30000)
  getRouteTripsDetail(@Param('routeId') routeId: string, @Req() req: any) {
    const routeIdNum = Number.parseInt(routeId, 10);
    if (Number.isNaN(routeIdNum)) {
      throw new BadRequestException('routeId must be a valid number');
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GetRouteTripsDetail({ routeId: routeIdNum }, req._grpcMetadata),
      ),
    );
  }

  @Get('reports/machinery-type')
  @GrpcTimeout(30000)
  generateMachineryTypeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required query parameters',
      );
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateMachineryTypeReport(
          {
            startDate,
            endDate,
          },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Get('reports/driver-consumption')
  @GrpcTimeout(30000)
  generateDriverConsumptionReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required query parameters',
      );
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateDriverConsumptionReport(
          {
            startDate,
            endDate,
          },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Get('reports/routes-consumption')
  @GrpcTimeout(30000)
  generateRoutesConsumptionReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required query parameters',
      );
    }

    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GenerateRoutesConsumptionReport(
          {
            startDate,
            endDate,
          },
          req._grpcMetadata,
        ),
      ),
    );
  }
}
