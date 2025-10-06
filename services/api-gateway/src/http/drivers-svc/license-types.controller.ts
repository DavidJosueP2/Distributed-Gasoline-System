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
} from '@nestjs/common';
import { Observable, from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { LicenseTypesServiceClient } from '../../grpc/clients/driverms/license-types.client';
import { LicenseTypesHttpMapper } from 'src/grpc/mappers/driver/license-types.mapper';

@Controller('license-types')
export class LicenseTypesHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<LicenseTypesServiceClient> {
    const appName = process.env.DRIVER_APP_NAME || 'DRIVER-SERVICE';
    const client = await this.factory.forService(
      appName,
      'driverms.v1',
      'driver_ms.proto',
    );
    return client.getService<LicenseTypesServiceClient>('LicenseTypesService');
  }

  @Post()
  @GrpcTimeout(2000)
  create(
    @Body()
    dto: { code: string; description?: string; isProfessional?: boolean },
    @Req() req: any,
  ): Observable<any> {
    const payload = LicenseTypesHttpMapper.toCreateLicenseType(dto);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Create(payload, req._grpcMetadata)),
      map((licenseType) => LicenseTypesHttpMapper.toLicenseTypeResponse(licenseType)),
    );
  }

  @Get()
  @GrpcTimeout(3000)
  findAll(@Req() req: any): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindAll({}, req._grpcMetadata)),
      map((response) => LicenseTypesHttpMapper.toLicenseTypeListResponse(response)),
    );
  }

  @Get('by-code')
  @GrpcTimeout(2000)
  findByCode(
    @Query('code') code: string,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindByCode({ code }, req._grpcMetadata)),
      map((licenseType) => LicenseTypesHttpMapper.toLicenseTypeResponse(licenseType)),
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
      map((licenseType) => LicenseTypesHttpMapper.toLicenseTypeResponse(licenseType)),
    );
  }

  @Put(':id')
  @GrpcTimeout(2000)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: { code?: string; description?: string; isProfessional?: boolean },
    @Req() req: any,
  ): Observable<any> {
    const payload = LicenseTypesHttpMapper.toUpdateLicenseType(id, dto);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Update(payload, req._grpcMetadata)),
      map((licenseType) => LicenseTypesHttpMapper.toLicenseTypeResponse(licenseType)),
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
      map((response) => LicenseTypesHttpMapper.toRemoveLicenseTypeResponse(response)),
    );
  }

  @Post(':parentId/includes')
  @GrpcTimeout(2000)
  addInclusion(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() dto: { childId: number },
    @Req() req: any,
  ): Observable<any> {
    const payload = LicenseTypesHttpMapper.toAddInclusionRequest({ parentId, childId: dto.childId });
    return from(this.svc(req)).pipe(
      switchMap((s) => s.AddInclusion(payload, req._grpcMetadata)),
      map((include) => LicenseTypesHttpMapper.toAddInclusionResponse(include)),
    );
  }

  @Delete(':parentId/includes/:childId')
  @GrpcTimeout(2000)
  removeInclusion(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Param('childId', ParseIntPipe) childId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = LicenseTypesHttpMapper.toRemoveInclusionRequest({ parentId, childId });
    return from(this.svc(req)).pipe(
      switchMap((s) => s.RemoveInclusion(payload, req._grpcMetadata)),
      map((response) => LicenseTypesHttpMapper.toRemoveInclusionResponse(response)),
    );
  }

  @Get(':id/closure')
  @GrpcTimeout(2000)
  getClosure(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.GetClosure({ license_type_id: id }, req._grpcMetadata)),
      map((response) => LicenseTypesHttpMapper.toGetClosureResponse(response)),
    );
  }
}
