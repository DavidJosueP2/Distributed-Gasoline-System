import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { Observable, from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { DriversServiceClient } from '../../grpc/clients/driverms/drivers.client';
import { DriversHttpMapper } from '../../grpc/mappers/driver/drivers.mapper';

@Controller('drivers')
export class DriversHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<DriversServiceClient> {
    const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
    const client = await this.factory.forService(
      appName,
      'driverms.v1',
      'driver_ms.proto',
    );
    return client.getService<DriversServiceClient>('DriversService');
  }

  @Post()
  @GrpcTimeout(3000)
  create(
    @Body() dto: {
      userId: number;
      availability?: string;
      version?: number;
    },
    @Req() req: any,
  ): Observable<any> {
    // Accept snake_case or camelCase and validate userId
    const incomingUserId = (dto as any).userId ?? (dto as any).user_id;
    if (incomingUserId === undefined || incomingUserId === null || Number(incomingUserId) <= 0) {
      throw new BadRequestException('userId inválido');
    }
    const payload = DriversHttpMapper.toCreateDriver(dto);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Create(payload, req._grpcMetadata)),
      map((driver) => DriversHttpMapper.toDriverResponse(driver)),
    );
  }

  @Get()
  @GrpcTimeout(3000)
  findAll(@Req() req: any): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindAll({}, req._grpcMetadata)),
      map((response) => DriversHttpMapper.toDriversListResponse(response)),
    );
  }

  @Get(':id')
  @GrpcTimeout(2000)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindOne({ id }, req._grpcMetadata)),
      map((driver) => DriversHttpMapper.toDriverResponse(driver)),
    );
  }

  @Put(':id')
  @GrpcTimeout(3000)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: {
      userId?: number;
      availability?: string;
      version?: number;
    },
    @Req() req: any,
  ): Observable<any> {
    // If userId provided, validate it
    const incomingUserId = (dto as any).userId ?? (dto as any).user_id;
    if (incomingUserId !== undefined && incomingUserId !== null && Number(incomingUserId) <= 0) {
      throw new BadRequestException('userId inválido');
    }
    const payload = DriversHttpMapper.toUpdateDriver(id, dto);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Update(payload, req._grpcMetadata)),
      map((driver) => DriversHttpMapper.toDriverResponse(driver)),
    );
  }

  @Delete(':id')
  @GrpcTimeout(2000)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Remove({ id }, req._grpcMetadata)),
      map((response) => DriversHttpMapper.toRemoveDriverResponse(response)),
    );
  }

  @Get(':id/can-drive')
  @GrpcTimeout(2000)
  canDrive(
    @Param('id', ParseIntPipe) driverId: number,
    @Query('licenseTypeId', ParseIntPipe) licenseTypeId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = DriversHttpMapper.toCanDriveRequest(driverId, licenseTypeId);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.CanDrive(payload, req._grpcMetadata)),
      map((response) => DriversHttpMapper.toCanDriveResponse(response)),
    );
  }
}
