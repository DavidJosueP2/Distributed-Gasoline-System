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
  Logger,
} from '@nestjs/common';
import { Observable, from, switchMap, map, forkJoin, of, lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { GrpcTimeout } from '../../grpc/grpc-timeout.interceptor';
import { DriversServiceClient } from '../../grpc/clients/driverms/drivers.client';
import { DriversHttpMapper } from '../../grpc/mappers/driver/drivers.mapper';
import { UserServiceClient } from '../../grpc/clients/user-svc/users.client';

@Controller('drivers')
export class DriversHttpController {
  private readonly logger = new Logger(DriversHttpController.name);

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

  private async usersSvc(req: any): Promise<UserServiceClient> {
    const appName = process.env.USERS_APP_NAME || 'USERS-SERVICE';
    const client = await this.factory.forService(
      appName,
      'users',
      'users.proto',
    );
    return client.getService<UserServiceClient>('UserService');
  }

  /**
   * Verifica si un usuario tiene el rol DRIVER
   */
  private async hasDriverRole(userId: number, req: any): Promise<boolean> {
    try {
      const usersService = await this.usersSvc(req);
      const user = await lastValueFrom(
        usersService.GetUser({ userId }, req._grpcMetadata),
      );

      const roles = user?.roles || [];
      const hasDriver = roles.some(
        (role: any) => (role.name || '').toUpperCase() === 'DRIVER',
      );

      if (!hasDriver) {
        this.logger.warn(
          `User ${userId} does not have DRIVER role. Roles: ${roles.map((r: any) => r.name).join(', ')}`,
        );
      }

      return hasDriver;
    } catch (error) {
      this.logger.error(
        `Error checking DRIVER role for user ${userId}: ${error.message}`,
      );
      return false; // Si hay error, no incluir el conductor
    }
  }

  /**
   * Filtra conductores que tienen el rol DRIVER
   */
  private async filterDriversByRole(
    drivers: any[],
    req: any,
  ): Promise<any[]> {
    if (!drivers || drivers.length === 0) return [];

    // Verificar roles en paralelo
    const driverChecks = await Promise.all(
      drivers.map(async (driver) => {
        const userId = Number(driver.userId || driver.user_id || 0);
        if (userId <= 0) {
          this.logger.warn(
            `Driver ${driver.driverId || driver.driver_id} has invalid userId`,
          );
          return null;
        }

        const hasRole = await this.hasDriverRole(userId, req);
        return hasRole ? driver : null;
      }),
    );

    // Filtrar los null
    const filtered = driverChecks.filter((d) => d !== null);
    this.logger.log(
      `Filtered ${drivers.length} drivers to ${filtered.length} with DRIVER role`,
    );

    return filtered;
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
    
    // Asegurar que el userId validado se pase al mapper
    const validatedUserId = Number(incomingUserId);
    const validatedDto = {
      ...dto,
      userId: validatedUserId,
    };
    
    const payload = DriversHttpMapper.toCreateDriver(validatedDto);
    console.log('🔍 API Gateway - validatedUserId:', validatedUserId);
    console.log('🔍 API Gateway - payload to gRPC:', JSON.stringify(payload, null, 2));
    
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
      switchMap((response) => {
        // Filtrar conductores que no tienen el rol DRIVER
        const drivers = response?.drivers || [];
        return from(this.filterDriversByRole(drivers, req)).pipe(
          map((filteredDrivers) => ({
            ...response,
            drivers: filteredDrivers,
            total: filteredDrivers.length,
          })),
        );
      }),
      map((response) => {
        console.log('🔍 GRPC RESPONSE TYPE:', typeof response?.drivers?.[0]?.driver_id);
        console.log('🔍 FIRST DRIVER_ID VALUE:', response?.drivers?.[0]?.driver_id);
        console.log('🔍 FIRST TOTAL VALUE:', response?.total);
        return DriversHttpMapper.toDriversListResponse(response);
      }),
    );
  }

  @Get('inactive')
  @GrpcTimeout(3000)
  findAllInactive(@Req() req: any): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.FindAllInactive({}, req._grpcMetadata)),
      switchMap((response) => {
        // Filtrar conductores que no tienen el rol DRIVER
        const drivers = response?.drivers || [];
        return from(this.filterDriversByRole(drivers, req)).pipe(
          map((filteredDrivers) => ({
            ...response,
            drivers: filteredDrivers,
            total: filteredDrivers.length,
          })),
        );
      }),
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

  @Post(':id/undelete')
  @GrpcTimeout(2000)
  undelete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Observable<any> {
    return from(this.svc(req)).pipe(
      switchMap((s) => s.Undelete({ id }, req._grpcMetadata)),
      map((driver) => DriversHttpMapper.toDriverResponse(driver)),
    );
  }

  @Get(':driverId/can-drive/:licenseTypeId')
  @GrpcTimeout(2000)
  canDrive(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Param('licenseTypeId', ParseIntPipe) licenseTypeId: number,
    @Req() req: any,
  ): Observable<any> {
    const payload = DriversHttpMapper.toCanDriveRequest(driverId, licenseTypeId);
    return from(this.svc(req)).pipe(
      switchMap((s) => s.CanDrive(payload, req._grpcMetadata)),
      map((response) => DriversHttpMapper.toCanDriveResponse(response)),
    );
  }
}
