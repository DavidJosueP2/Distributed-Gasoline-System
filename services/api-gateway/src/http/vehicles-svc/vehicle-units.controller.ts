import { Controller, Get, Req, Post, Body, Patch, Param, Put, Query, BadRequestException } from '@nestjs/common';
import { Delete } from '@nestjs/common';
import { from, switchMap, map, of } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { VehiclesServiceClient, ListUnitsResponse } from '../../grpc/clients/vehicles-svc/vehicles.client';
import { VehicleUnitsHttpMapper } from '../../grpc/mappers/vehicle/vehicle-units.mapper';

@Controller('vehicles/units')
export class VehicleUnitsHttpController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: any): Promise<VehiclesServiceClient> {
    const appName = process.env.VEHICLES_APP_NAME || 'VEHICLES-SERVICE';
    const client = await this.factory.forService(appName, 'vehicles.v1', 'vehicles.proto');
    return client.getService<VehiclesServiceClient>('VehiclesService');
  }

  // ---------- List ----------
  @Get()
  @GrpcTimeout(1500)
  listUnits(@Query('machineType') machineType: string | undefined, @Req() req: any) {
    let machineTypeFilter: number | undefined;
    if (machineType) {
      const normalized = machineType.toUpperCase();
      if (normalized === 'LIGHT' || normalized === '1') {
        machineTypeFilter = 1;
      } else if (normalized === 'HEAVY' || normalized === '2') {
        machineTypeFilter = 2;
      }
    }

    return from(this.svc(req)).pipe(
      switchMap(svc => svc.ListUnits({ machineTypeFilter }, req._grpcMetadata)),
      map((res: ListUnitsResponse) => res.units?.map(u => VehicleUnitsHttpMapper.toUnit(u)) || []),
    );
  }

  // ---------- Create ----------
  @Post()
  @GrpcTimeout(2000)
  createUnit(@Body() body: any, @Req() req: any) {
    const payload = VehicleUnitsHttpMapper.toCreate(body);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.CreateUnit(payload, req._grpcMetadata)),
      map(created => ({ vehicleId: created.vehicleId })),
    );
  }

  // ---------- Update Status ----------
  @Patch(':id/status')
  @GrpcTimeout(1500)
  updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const payload = VehicleUnitsHttpMapper.toStatus(id, body);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.UpdateUnitStatus(payload, req._grpcMetadata)),
      map(ts => ({ updatedAt: VehicleUnitsHttpMapper.toIso(ts) })),
    );
  }

  // ---------- Upsert Consumption ----------
  @Put(':id/consumption')
  @GrpcTimeout(1500)
  upsertConsumption(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const payload = VehicleUnitsHttpMapper.toConsumption(id, body);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.UpsertUnitConsumption(payload, req._grpcMetadata)),
      map(res => VehicleUnitsHttpMapper.toConsumptionResponse(res)),
    );
  }

  // ---------- Update (plate & tank) ----------
  @Patch(':id')
  @GrpcTimeout(1500)
  updateUnit(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const payload = VehicleUnitsHttpMapper.toUpdate(id, body);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.UpdateUnit(payload, req._grpcMetadata)),
      map(u => VehicleUnitsHttpMapper.toUnit(u)),
    );
  }

  // ---------- Search (by id | plate | vin) ----------
  @Get('search')
  @GrpcTimeout(1500)
  searchUnit(@Query() query: any, @Req() req: any) {
    const getReq = VehicleUnitsHttpMapper.toGetUnitRequest(query);
    if (!getReq.vehicleId && !getReq.plate && !getReq.serialVin) {
      throw new BadRequestException('Debe proveer vehicleId, plate o vin');
    }
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.GetUnit(getReq, req._grpcMetadata)),
      map(res => VehicleUnitsHttpMapper.toUnit(res.unit)),
    );
  }

  // ---------- Delete (soft) ----------
  @Delete(':id')
  @GrpcTimeout(1500)
  deleteUnit(@Param('id') id: string, @Req() req: any) {
    const delReq = VehicleUnitsHttpMapper.toDeleteRequest(id);
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.DeleteUnit(delReq, req._grpcMetadata)),
      map(res => VehicleUnitsHttpMapper.toDeleteResponse(res)),
    );
  }

  // ---------- Get Consumption Profile ----------
  @Get(':id/consumption/profile')
  @GrpcTimeout(1500)
  getConsumptionProfile(@Param('id') id: string, @Req() req: any) {
    const payload = { vehicleId: id };
    return from(this.svc(req)).pipe(
      switchMap(svc => svc.GetUnitConsumptionProfile(payload, req._grpcMetadata)),
      map(res => VehicleUnitsHttpMapper.toConsumptionProfile(res)),
    );
  }
}
