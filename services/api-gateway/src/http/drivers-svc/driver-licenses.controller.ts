import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { Observable, from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { DriverLicensesServiceClient } from '../../grpc/clients/driverms/driver-licenses.client';
import { DriverLicensesHttpMapper } from '../../grpc/mappers/driver/driver-licenses.mapper';

@Controller('drivers')
export class DriverLicensesHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<DriverLicensesServiceClient> {
    const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
    const client = await this.factory.forService(
      appName,
      'driverms.v1',
      'driver_ms.proto',
    );
    return client.getService<DriverLicensesServiceClient>(
      'DriverLicensesService',
    );
  }

  @Post(':driverId/licenses')
  @GrpcTimeout(3000)
  createLicense(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body()
    dto: {
      licenseTypeId: number;
      number: string;
      issuedAt: string;
      expiresAt: string;
      status?: string;
    },
    @Req() req: any,
  ): Observable<any> {
    const payload = DriverLicensesHttpMapper.toCreateDriverLicense({ ...dto, driverId });
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Create(payload, req._grpcMetadata)),
      map((license) => DriverLicensesHttpMapper.toDriverLicenseResponse(license)),
    );
  }

  @Get(':driverId/licenses')
  @GrpcTimeout(3000)
  findByDriver(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = DriverLicensesHttpMapper.toFindByDriverRequest(driverId);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindByDriver(payload, req._grpcMetadata)),
      map((response) => DriverLicensesHttpMapper.toDriverLicenseListResponse(response)),
    );
  }

  @Post(':driverId/licenses/:licenseId/suspend')
  @GrpcTimeout(2000)
  suspendLicense(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseId', ParseIntPipe) licenseId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = DriverLicensesHttpMapper.toSuspendLicenseRequest(driverId, licenseId);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Suspend(payload, req._grpcMetadata)),
      map((license) => DriverLicensesHttpMapper.toDriverLicenseResponse(license)),
    );
  }

  @Get(':driverId/licenses/active')
  @GrpcTimeout(2000)
  findActiveLicenses(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = DriverLicensesHttpMapper.toFindByDriverRequest(driverId);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindActiveByDriver(payload, req._grpcMetadata)),
      map((response) => DriverLicensesHttpMapper.toDriverLicenseListResponse(response)),
    );
  }
}
