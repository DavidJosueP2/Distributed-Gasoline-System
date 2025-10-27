import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, map, Observable, switchMap } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import type {
  CreateRouteRequest,
  UpdateRouteRequest,
  RouteResponse,
  RoutesServiceClient,
  LongObject,
} from '../../grpc/clients/routes.client';

type RequestWithGrpc = Request & { _grpcMetadata?: Record<string, unknown> };

type LongLike = string | number | LongObject | undefined | null;

const isLongObject = (value: unknown): value is LongObject =>
  typeof value === 'object' &&
  value !== null &&
  'low' in (value as any) &&
  'high' in (value as any);

const toPlainNumber = (value: LongLike): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (isLongObject(value)) {
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    const low = value.low >>> 0;
    const high = value.high >>> 0;
    return high * 2 ** 32 + low;
  }
  return Number(value as any);
};

const normalizeRoute = (route: RouteResponse): RouteResponse => ({
  ...route,
  id: toPlainNumber(route.id),
});

@Controller('routes')
export class RoutesController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: RequestWithGrpc): Promise<RoutesServiceClient> {
    const appName = process.env.ROUTES_APP_NAME || 'ROUTES-SERVICE';
    const client = await this.factory.forService(
      appName,
      'routes',
      'routes.proto',
    );
    return client.getService<RoutesServiceClient>('RoutesService');
  }

  @Get()
  getAll(
    @Query('vehicleType') vehicleType?: string,
    @Req() req: RequestWithGrpc = {} as RequestWithGrpc,
  ): Observable<RouteResponse[]> {
    const vehicleTypeFilter = vehicleType ? Number(vehicleType) : undefined;
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc
          .ListRoutes({ vehicleTypeFilter }, req._grpcMetadata)
          .pipe(map((res) => res?.routes?.map(normalizeRoute) ?? [])),
      ),
    );
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: RequestWithGrpc,
  ): Observable<RouteResponse> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GetRoute({ id }, req._grpcMetadata).pipe(
          map((res) => normalizeRoute(res.route)),
        ),
      ),
    );
  }

  @Post()
  create(
    @Body() dto: CreateRouteRequest,
    @Req() req: RequestWithGrpc,
  ): Observable<{ id: string }> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.CreateRoute(dto, req._grpcMetadata),
      ),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRouteRequest,
    @Req() req: RequestWithGrpc,
  ): Observable<RouteResponse> {
    dto.id = id;
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.UpdateRoute(dto, req._grpcMetadata).pipe(map(normalizeRoute)),
      ),
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: RequestWithGrpc,
  ): Observable<{}> {
    return from(this.svc(req)).pipe(
      switchMap((svc) => svc.DeleteRoute({ id }, req._grpcMetadata)),
    );
  }

  @Post(':id/assign-vehicle')
  assignVehicle(
    @Param('id') routeId: string,
    @Body() body: { vehicleId: string },
    @Req() req: RequestWithGrpc,
  ): Observable<{ success: boolean; message: string }> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.AssignVehicleToRoute(
          { routeId, vehicleId: body.vehicleId },
          req._grpcMetadata,
        ),
      ),
    );
  }
}
