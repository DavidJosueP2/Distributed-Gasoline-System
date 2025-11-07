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
            routeName: res.routeName || res.route_name || '',
            originName: res.originName || res.origin_name || '',
            destinationName: res.destinationName || res.destination_name || '',
            originLat: res.originLat ?? res.origin_lat ?? 0,
            originLng: res.originLng ?? res.origin_lng ?? 0,
            destinationLat: res.destinationLat ?? res.destination_lat ?? 0,
            destinationLng: res.destinationLng ?? res.destination_lng ?? 0,
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
    @Body() body: { currentLat?: number; currentLng?: number },
    @Req() req: RequestWithGrpc,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((svc) =>
        (svc as any).FinishTrip({ id, currentLat: body.currentLat, currentLng: body.currentLng }, req._grpcMetadata),
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
        (svc as any).GetAssignableDrivers({}, req._grpcMetadata).pipe(
          map((res: any) => {
            // Mapear de snake_case (proto) a camelCase (gateway/API)
            const drivers = res?.drivers || [];
            return drivers.map((driver: any) => ({
              id: toPlainNumber(driver.id || driver.user_id),
              userId: toPlainNumber(driver.user_id || driver.userId),
              firstName: driver.first_name || driver.firstName || '',
              lastName: driver.last_name || driver.lastName || '',
              isAssignable: driver.is_assignable ?? driver.isAssignable ?? false,
              licenseTypeCodes: driver.license_type_codes || driver.licenseTypeCodes || [],
            }));
          }),
        ),
      ),
    );
  }

  // Helper method para procesar la petición de vehículos asignables
  private processAssignableVehiclesRequest(
    driverLicenseTypeCodes?: string | string[],
    routeVehicleType?: string,
    req?: RequestWithGrpc,
  ): Observable<any> {
    const requestWithGrpc = req || {} as RequestWithGrpc;
    return from(this.svc(requestWithGrpc)).pipe(
      switchMap((svc) => {
        // Preparar parámetros para gRPC
        // IMPORTANTE: Enviar en camelCase - NestJS transformará automáticamente a snake_case para el proto
        // (igual que en users-srv y otros servicios)
        const request: any = {};
        
        // Convertir driverLicenseTypeCodes a array si viene como string
        // Solo agregar al request si tiene valores válidos (no undefined, null, o array vacío)
        if (driverLicenseTypeCodes !== undefined && driverLicenseTypeCodes !== null) {
          let codes: string[] = [];
          
          if (Array.isArray(driverLicenseTypeCodes)) {
            codes = driverLicenseTypeCodes.filter(code => code && typeof code === 'string' && code.trim() !== '');
          } else if (typeof driverLicenseTypeCodes === 'string' && driverLicenseTypeCodes.trim() !== '') {
            codes = driverLicenseTypeCodes.split(',').map(c => c.trim()).filter(c => c !== '');
          }
          
          // Solo agregar si hay códigos válidos
          if (codes.length > 0) {
            // Enviar en camelCase - NestJS transformará a snake_case automáticamente
            request.driverLicenseTypeCodes = codes;
          }
        }
        
        // Convertir routeVehicleType (puede venir como string "LIVIANO", "PESADO", "CUALQUIERA")
        // Solo agregar si tiene un valor válido
        if (routeVehicleType !== undefined && routeVehicleType !== null && routeVehicleType !== '') {
          // Enviar en camelCase - NestJS transformará a snake_case automáticamente
          request.routeVehicleType = routeVehicleType;
        }
        
        return (svc as any).GetAssignableVehicles(request, requestWithGrpc._grpcMetadata).pipe(
          map((res: any) => {
            // Mapear de snake_case (proto) a camelCase (gateway/API)
            const vehicles = res?.vehicles || [];
            return vehicles.map((vehicle: any) => ({
              id: toPlainNumber(vehicle.id),
              plate: vehicle.plate || '',
              isAssignable: vehicle.is_assignable ?? vehicle.isAssignable ?? false,
            }));
          }),
        );
      }),
    );
  }

  @Get('assignable/vehicles')
  getAssignableVehicles(
    @Query('driverLicenseTypeCodes') driverLicenseTypeCodes?: string | string[],
    @Query('routeVehicleType') routeVehicleType?: string,
    @Req() req: RequestWithGrpc = {} as RequestWithGrpc,
  ): Observable<any> {
    return this.processAssignableVehiclesRequest(driverLicenseTypeCodes, routeVehicleType, req);
  }

  @Post('assignable/vehicles')
  getAssignableVehiclesPost(
    @Body() body: any,
    @Req() req: RequestWithGrpc = {} as RequestWithGrpc,
  ): Observable<any> {
    // Aceptar tanto camelCase como snake_case del body
    const driverLicenseTypeCodes = body?.driverLicenseTypeCodes || body?.driver_license_type_codes;
    const routeVehicleType = body?.routeVehicleType || body?.route_vehicle_type;
    
    return this.processAssignableVehiclesRequest(driverLicenseTypeCodes, routeVehicleType, req);
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
