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
  CreateTripRequest,
  UpdateTripRequest,
  TripResponse,
  TripsServiceClient,
  LongObject,
} from '../../grpc/clients/trips.client';

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

const normalizeTrip = (trip: TripResponse): TripResponse => ({
  ...trip,
  id: toPlainNumber(trip.id),
  routeId: toPlainNumber(trip.routeId),
  supervisorId: toPlainNumber(trip.supervisorId),
  driverId: toPlainNumber(trip.driverId),
  vehicleId: toPlainNumber(trip.vehicleId),
});

@Controller('trips')
export class TripsController {
  constructor(private readonly factory: GrpcClientFactory) {}

  private async svc(req: RequestWithGrpc): Promise<TripsServiceClient> {
    const appName = process.env.ROUTES_APP_NAME || 'ROUTES-SERVICE';
    const client = await this.factory.forService(
      appName,
      'routes.v1',
      'routes.proto',
    );
    return client.getService<TripsServiceClient>('TripsService');
  }

  @Get()
  getAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Req() req: RequestWithGrpc = {} as RequestWithGrpc,
  ): Observable<{ trips: { CREADO: TripResponse[]; EN_RUTA: TripResponse[]; EN_REVISION: TripResponse[]; TERMINADO: TripResponse[] }; userRole: string; totalTrips: number }> {
    const statusFilter = status ? Number(status) : undefined;
    const driverIdFilter = driverId ? driverId : undefined;
    
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc
          .ListTrips({ statusFilter, driverIdFilter }, req._grpcMetadata)
          .pipe(
            map((res: any) => {
              const segmented = res?.trips ?? {};
              const normalizeList = (list?: TripResponse[]) => (list ?? []).map(normalizeTrip);
              return {
                trips: {
                  CREADO: normalizeList(segmented.CREADO),
                  EN_RUTA: normalizeList(segmented.EN_RUTA),
                  EN_REVISION: normalizeList(segmented.EN_REVISION),
                  TERMINADO: normalizeList(segmented.TERMINADO),
                },
                userRole: res?.userRole ?? res?.user_role ?? 'GUEST',
                totalTrips: typeof res?.totalTrips === 'number' ? res.totalTrips : (res?.total_trips ?? 0),
              };
            }),
          ),
      ),
    );
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.GetTrip({ id }, req._grpcMetadata).pipe(
          map((res: any) => ({
            ...normalizeTrip(res.trip),
            driverInfo: res.driverInfo || res.driver_info,
            supervisorInfo: res.supervisorInfo || res.supervisor_info,
            vehicleInfo: res.vehicleInfo || res.vehicle_info,
          })),
        ),
      ),
    );
  }

  @Post()
  create(
    @Body() dto: CreateTripRequest,
    @Req() req: RequestWithGrpc,
  ): Observable<{ id: string; fuelEstimated: number }> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.CreateTrip(dto, req._grpcMetadata),
      ),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripRequest,
    @Req() req: RequestWithGrpc,
  ): Observable<TripResponse> {
    dto.id = id;
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.UpdateTrip(dto, req._grpcMetadata).pipe(map(normalizeTrip)),
      ),
    );
  }

  @Post(':id/start')
  startTrip(
    @Param('id') id: string,
    @Body() body: { currentLat?: number; currentLng?: number },
    @Req() req: RequestWithGrpc,
  ): Observable<{ startTime: { seconds: number; nanos: number } }> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        svc.StartTrip({ id, currentLat: body.currentLat, currentLng: body.currentLng }, req._grpcMetadata),
      ),
    );
  }

  @Post(':id/finish')
  finishTrip(
    @Param('id') id: string,
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).FinishTrip({ id }, req._grpcMetadata),
      ),
    );
  }

  @Post(':id/review')
  reviewTrip(
    @Param('id') id: string,
    @Body() body: { odometerEnd: number; reviewComment?: string },
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).ReviewTrip({ id, odometerEnd: body.odometerEnd, reviewComment: body.reviewComment ?? '' }, req._grpcMetadata),
      ),
    );
  }

  @Put(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() body: { currentLat: number; currentLng: number; currentDistance?: number },
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).UpdateTripLocation(
          { id, currentLat: body.currentLat, currentLng: body.currentLng, currentDistance: body.currentDistance ?? 0 },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Post(':id/calc-metrics')
  calculateMetrics(
    @Param('id') id: string,
    @Body() body: { odometerEnd: number },
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).CalculateTripMetrics(
          { id, odometerEnd: body.odometerEnd },
          req._grpcMetadata,
        ),
      ),
    );
  }

  @Get('assignable/drivers')
  getAssignableDrivers(@Req() req: RequestWithGrpc): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).GetAssignableDrivers({}, req._grpcMetadata),
      ),
    );
  }

  @Get('assignable/vehicles')
  getAssignableVehicles(@Req() req: RequestWithGrpc): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).GetAssignableVehicles({}, req._grpcMetadata),
      ),
    );
  }

  @Get('assignable/supervisors')
  getAssignableSupervisors(@Req() req: RequestWithGrpc): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).GetAssignableSupervisors({}, req._grpcMetadata),
      ),
    );
  }
}
