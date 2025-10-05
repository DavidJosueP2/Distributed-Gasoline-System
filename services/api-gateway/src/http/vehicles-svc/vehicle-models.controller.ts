import { Controller, Get, Param, Query, Post, Body, Req, Patch, Delete, Put } from '@nestjs/common';
import { Observable, from, switchMap, map } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { VehiclesServiceClient, ListModelsResponse, GetModelResponse } from '../../grpc/clients/vehicles.client';
import { VehiclesHttpToGrpcMapper } from '../../grpc/mappers/vehicles-models.mapper';

@Controller('vehicles/models')
export class VehicleModelsHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<VehiclesServiceClient> {
    const appName = process.env.VEHICLES_APP_NAME || 'VEHICLES-SERVICE';
    const client = await this.factory.forService(appName, 'vehicles.v1', 'vehicles.proto');
    return client.getService<VehiclesServiceClient>('VehiclesService');
  }

  @Get()
  @GrpcTimeout(1500)
  list(@Req() req: any): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.ListModels({}, req._grpcMetadata)),
      map(res => VehiclesHttpToGrpcMapper.toListModelsResponse(res.models)),
    );
  }

  @Get('by-identity')
  @GrpcTimeout(1500)
  getByIdentity(
    @Query('brand') brand: string,
    @Query('family') family: string,
    @Query('trim') trim: string | undefined,
    @Query('yearFrom') yearFrom: string,
    @Query('yearTo') yearTo: string | undefined,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap(svc =>
        svc.GetModelByIdentity(
          {
            brand,
            family,
            trim,
            yearFrom: Number(yearFrom),
            yearTo: yearTo === undefined || yearTo === '' ? 0 : Number(yearTo),
          },
          req._grpcMetadata,
        ),
      ),
      map(res => VehiclesHttpToGrpcMapper.toGetModelResponse(res)),
    );
  }

  @Get(':id')
  @GrpcTimeout(1500)
  getById(@Param('id') id: string, @Req() req: any): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.GetModel({ modelId: id }, req._grpcMetadata)),
      map(res => VehiclesHttpToGrpcMapper.toGetModelResponse(res)),
    );
  }

  @Post()
  @GrpcTimeout(2000)
  create(@Body() body: any, @Req() req: any) {
    const payload = VehiclesHttpToGrpcMapper.toCreateModel(body);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.CreateModel(payload, req._grpcMetadata)),
      map(res => ({ modelId: res.modelId })),
    );
  }

  @Patch(':id')
  @GrpcTimeout(2000)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const payload = VehiclesHttpToGrpcMapper.toUpdateModel(id, body);

    return from(this.svc(req)).pipe(
      switchMap(svc => svc.UpdateModel(payload as any, req._grpcMetadata)),
      map(model => VehiclesHttpToGrpcMapper.toModelResponse(model)),
    );
  }

  @Delete(':id')
  @GrpcTimeout(2000)
  delete(@Param('id') id: string, @Query('expectedVersion') expectedVersion: string | undefined, @Req() req: any) {
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.DeleteModel({ modelId: id, expectedVersion }, req._grpcMetadata)),
      map(() => ({ success: true, message: 'Model deleted successfully' })),
    );
  }

  // ========== License Management ==========

  /**
   * GET /vehicles/models/:id/license-reqs
   * Lista las licencias requeridas para un modelo
   */
  @Get(':id/license-reqs')
  @GrpcTimeout(1500)
  listLicenses(@Param('id') id: string, @Req() req: any) {
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.ListModelLicenseRequirements({ modelId: id }, req._grpcMetadata)),
      map(res => res.licenses || []),
    );
  }

  /**
   * PUT /vehicles/models/:id/license-reqs
   * Reemplaza el array completo de licencias (enforce soft-unique)
   */
  @Put(':id/license-reqs')
  @GrpcTimeout(2000)
  setLicenses(@Param('id') id: string, @Body() body: { licenses: any[] }, @Req() req: any) {
    const licenses = (body.licenses || []).map((l: any) => ({
      licenseTypeCode: l.licenseTypeCode || l.code,
      licenseTypeId: l.licenseTypeId || l.id,
    }));

    return from(this.svc(req)).pipe(
      switchMap(svc => svc.SetModelLicenseRequirements({ modelId: id, licenses }, req._grpcMetadata)),
      map(res => ({ licenses: res.licenses || [] })),
    );
  }

  /**
   * DELETE /vehicles/models/:id/license-reqs/:licenseRef
   * Elimina una licencia específica por código o ID
   * Ejemplos:
   * - DELETE /vehicles/models/1/license-reqs/A (por código)
   * - DELETE /vehicles/models/1/license-reqs?id=123 (por ID vía query)
   */
  @Delete(':id/license-reqs/:licenseRef')
  @GrpcTimeout(1500)
  deleteLicense(
    @Param('id') id: string,
    @Param('licenseRef') licenseRef: string,
    @Query('id') licenseId: string | undefined,
    @Req() req: any,
  ) {
    // Determinar si es código (letra) o ID (número)
    const isCode = /^[A-Za-z]+$/.test(licenseRef);
    const request = {
      modelId: id,
      licenseTypeCode: isCode ? licenseRef : undefined,
      licenseTypeId: !isCode ? licenseRef : licenseId,
    };

    return from(this.svc(req)).pipe(
      switchMap(svc => svc.DeleteModelLicenseRequirement(request, req._grpcMetadata)),
      map(res => ({ remainingLicenses: res.remainingLicenses || [] })),
    );
  }
}
