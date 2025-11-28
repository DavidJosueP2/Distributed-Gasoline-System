import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, IsNull, Not } from 'typeorm';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver, DriverAvailability } from './entities/driver.entity';
import { LicenseTypesService } from '../license-types/license-types.service';
import { DriverLicense } from '../driver-licenses/entities/driver-license.entity';
import { UsersGrpcClient } from './users-grpc.client';
import { GrpcClientFactory } from '../grpc/grpc-client.factory';
import { RoutesClient } from '../grpc/clients/routes.client';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly licenseTypesService: LicenseTypesService,
    private readonly usersGrpcClient: UsersGrpcClient,
    private readonly grpcFactory: GrpcClientFactory,
  ) {}

  private async routesClient(): Promise<RoutesClient> {
    const client = await this.grpcFactory.clientFor(
      'ROUTES-SERVICE',
      'routes.v1',
      'routes.proto',
    );
    return new RoutesClient(client);
  }

  // Método para convertir IDs de gRPC
  private convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null && 'low' in id) {
      return Number(id.low) || 0;
    }
    return Number(id) || 0;
  }

  async create(createDriverDto: CreateDriverDto, metadata?: any): Promise<Driver> {
    this.logger.log(`Creating driver for user_id: ${createDriverDto.user_id}`);

    // Normalize and validate user_id before calling users service
    let outgoingUserId: any = createDriverDto.user_id;
    if (typeof outgoingUserId === 'object' && outgoingUserId !== null && Object.prototype.hasOwnProperty.call(outgoingUserId, 'low')) {
      outgoingUserId = Number((outgoingUserId as any).low);
    } else {
      outgoingUserId = Number(outgoingUserId);
    }

    if (!Number.isFinite(outgoingUserId) || outgoingUserId <= 0) {
      this.logger.error(`Invalid user_id provided: ${createDriverDto.user_id}`);
      throw new BadRequestException('userId inválido');
    }

    try {
      // Validar que el user_id existe en users-srv
  this.logger.log(`Validating user via users-srv gRPC: ${outgoingUserId}`);
  await this.usersGrpcClient.getUser(outgoingUserId, metadata);
      this.logger.log(`User ${outgoingUserId} validated successfully`);

      // Crear el conductor localmente
      const driver = this.driverRepository.create({
        user_id: createDriverDto.user_id,
        availability: createDriverDto.availability || DriverAvailability.AVAILABLE,
        version: createDriverDto.version || 0,
      } as DeepPartial<Driver>);

      const savedDriver = await this.driverRepository.save(driver);
      this.logger.log(`Driver created successfully with ID: ${savedDriver.driver_id}`);
      
      return savedDriver;

    } catch (error) {
      this.logger.error('Error creating driver', error);

      if (error.message?.includes('not found')) {
        throw new NotFoundException(`User with ID ${createDriverDto.user_id} not found`);
      }

      if (error.message?.includes('timeout') || error.message?.includes('UNAVAILABLE')) {
        throw new InternalServerErrorException(
          'Users service temporarily unavailable. Please try again later.',
        );
      }

      throw new InternalServerErrorException(
        `Failed to create driver: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<Driver[]> {
    return await this.driverRepository.find({
      where: { deleted_at: IsNull() },
      relations: ['licenses', 'licenses.license_type'],
    });
  }

  async findAllInactive(): Promise<Driver[]> {
    return await this.driverRepository.find({
      where: { deleted_at: Not(IsNull()) },
      relations: ['licenses', 'licenses.license_type'],
    });
  }

  // Cambiar a any pero convertir antes de usar
  // Este método busca conductores activos e inactivos (sin filtrar por deleted_at)
  // para permitir ver detalles de conductores eliminados
  async findOne(id: any): Promise<Driver> {
    const convertedId = this.convertGrpcId(id);
    
    const driver = await this.driverRepository.findOne({
      where: { driver_id: convertedId },
      relations: ['licenses', 'licenses.license_type'],
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${convertedId} not found`);
    }

    return driver;
  }

  // Buscar conductor por user_id
  async findByUserId(userId: any): Promise<Driver> {
    const convertedUserId = this.convertGrpcId(userId);
    const driver = await this.driverRepository.findOne({
      where: { user_id: convertedUserId, deleted_at: IsNull() },
      relations: ['licenses', 'licenses.license_type'],
    });

    if (!driver) {
      throw new NotFoundException(`Driver with user_id ${convertedUserId} not found`);
    }

    return driver;
  }

  // Cambiar a any pero convertir antes de usar
  async update(id: any, updateDriverDto: UpdateDriverDto, metadata?: any): Promise<Driver> {
    const convertedId = this.convertGrpcId(id);
    this.logger.log(`Updating driver with ID: ${convertedId}`);

    // Buscar el conductor existente
    const driver = await this.findOne(convertedId);

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${convertedId} not found`);
    }

    try {
      // Si se actualiza el user_id, validar que existe en users-srv
      if (updateDriverDto.user_id !== undefined && updateDriverDto.user_id !== driver.user_id) {
        // normalize
        let newUserId: any = updateDriverDto.user_id;
        if (typeof newUserId === 'object' && newUserId !== null && Object.prototype.hasOwnProperty.call(newUserId, 'low')) {
          newUserId = Number((newUserId as any).low);
        } else {
          newUserId = Number(newUserId);
        }

        if (!Number.isFinite(newUserId) || newUserId <= 0) {
          this.logger.error(`Invalid new user_id provided: ${updateDriverDto.user_id}`);
          throw new BadRequestException('userId inválido');
        }

  this.logger.log(`Validating new user_id ${newUserId} via gRPC`);
  await this.usersGrpcClient.getUser(newUserId, metadata);
        driver.user_id = newUserId;
        this.logger.log(`User ${newUserId} validated successfully`);
      }

      // Actualizar campos del conductor
      if (updateDriverDto.availability !== undefined) {
        driver.availability = this.mapProtoAvailabilityToString(updateDriverDto.availability);
      }

      if (updateDriverDto.version !== undefined) {
        driver.version = updateDriverDto.version;
      }

      // Guardar cambios
      const updatedDriver = await this.driverRepository.save(driver);
      this.logger.log(`Driver ${convertedId} updated successfully`);

      return updatedDriver;

    } catch (error) {
      this.logger.error(`Error updating driver ${convertedId}`, error);

      if (error.message?.includes('timeout') || error.message?.includes('UNAVAILABLE')) {
        throw new InternalServerErrorException(
          'Users service temporarily unavailable. Please try again later.',
        );
      }

      if (error.message?.includes('not found')) {
        throw new NotFoundException(`User with ID ${updateDriverDto.user_id} not found in users service`);
      }

      throw new InternalServerErrorException(
        `Failed to update driver: ${error.message}`,
      );
    }
  }

private mapProtoAvailabilityToString(
  availability: number | string,
): DriverAvailability {
  // Si ya es un string válido, devuélvelo tal cual
  if (typeof availability === 'string') {
    return availability as DriverAvailability;
  }

  // Si es numérico, mapearlo según el enum
  switch (availability) {
    case 1: return DriverAvailability.AVAILABLE;
    case 2: return DriverAvailability.ON_ROUTE;
    case 3: return DriverAvailability.LICENSE_EXPIRED;
    case 4: return DriverAvailability.INACTIVE;
    default: return DriverAvailability.AVAILABLE;
  }
}

  // Cambiar a any pero convertir antes de usar
  async remove(id: any, metadata?: any): Promise<void> {
    const convertedId = this.convertGrpcId(id);
    
    // Buscar el conductor para obtener el user_id
    const driver = await this.driverRepository.findOne({
      where: { driver_id: convertedId, deleted_at: IsNull() },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${convertedId} not found`);
    }

    // Validar que no tenga viajes asociados
    try {
      const routesClient = await this.routesClient();
      const hasTrips = await routesClient.hasTripsByDriver(convertedId);
      
      if (hasTrips) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: `No se puede eliminar el conductor con ID ${convertedId} porque tiene viajes asociados. Debe finalizar o reasignar todos los viajes antes de eliminar el conductor.`,
        });
      }
    } catch (error) {
      // Si el error es RpcException, re-lanzarlo
      if (error instanceof RpcException) {
        throw error;
      }
      // Si hay error de conexión con routes-srv, loguear pero permitir la eliminación
      this.logger.warn(
        `Error al verificar viajes del conductor ${convertedId}: ${error instanceof Error ? error.message : 'Error desconocido'}. Continuando con la eliminación.`,
      );
    }

    // Eliminación lógica del conductor
    await this.driverRepository.update(convertedId, {
      deleted_at: new Date(),
    });

    // Eliminación lógica del usuario asociado
    try {
      await this.usersGrpcClient.deleteUser(driver.user_id, metadata);
      this.logger.log(`User ${driver.user_id} logically deleted along with driver ${convertedId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user ${driver.user_id} for driver ${convertedId}:`, error);
      // No lanzamos el error para que la eliminación del conductor se complete
      // pero registramos el error para debugging
    }
  }

  // Restaurar conductor eliminado lógicamente
  async undelete(id: any, metadata?: any): Promise<Driver> {
    const convertedId = this.convertGrpcId(id);
    
    const driver = await this.driverRepository.findOne({
      where: { driver_id: convertedId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${convertedId} not found`);
    }

    if (!driver.deleted_at) {
      throw new BadRequestException(`Driver with ID ${convertedId} is not deleted`);
    }

    // Restaurar el conductor
    await this.driverRepository.update(convertedId, {
      deleted_at: null as any,
    });

    // Restaurar el usuario asociado
    try {
      await this.usersGrpcClient.undeleteUser(driver.user_id, metadata);
      this.logger.log(`User ${driver.user_id} restored along with driver ${convertedId}`);
    } catch (error) {
      this.logger.error(`Failed to restore user ${driver.user_id} for driver ${convertedId}:`, error);
      // No lanzamos el error para que la restauración del conductor se complete
    }

    // Retornar el conductor restaurado
    return await this.findOne(convertedId);
  }

  // Cambiar a any pero convertir antes de usar
  async canDrive(driverId: any, licenseTypeId: any): Promise<{
  can_drive: boolean;
  reason?: string;
  matching_licenses?: Array<{
    license_id: number;
    license_type: string;
    expires_at: string;
  }>;
}> {
  const convertedDriverId = this.convertGrpcId(driverId);
  const convertedLicenseTypeId = this.convertGrpcId(licenseTypeId);
  
  const driver = await this.driverRepository.findOne({
      where: { driver_id: convertedDriverId, deleted_at: IsNull() },
      relations: ['licenses', 'licenses.license_type'],
    });

  if (!driver) {
    return {
      can_drive: false,
      reason: 'Driver not found',
      matching_licenses: []
    };
  }

  const validLicenses = (driver.licenses || []).filter(
    (l: DriverLicense) => l.status === 'VALID',
  );

  // Buscar licencia directa
  const directLicense = validLicenses.find((l) => l.license_type_id === convertedLicenseTypeId);
  if (directLicense) {
    return {
      can_drive: true,
      reason: 'Driver has direct license match',
      matching_licenses: [{
        license_id: directLicense.driver_license_id,
        license_type: directLicense.license_type?.code || 'Unknown',
        expires_at: directLicense.expires_at ? directLicense.expires_at.toISOString() : ''
      }]
    };
  }

  // Buscar en el closure
  if (this.licenseTypesService) {
    const closure = await this.licenseTypesService.getLicenseClosure(convertedLicenseTypeId);
    const parentLicenses = validLicenses.filter((l) => closure.includes(l.license_type_id));
    
    if (parentLicenses.length > 0) {
      return {
        can_drive: true,
        reason: 'Driver has parent license that includes requested type',
        matching_licenses: parentLicenses.map(license => ({
          license_id: license.driver_license_id,
          license_type: license.license_type?.code || 'Unknown',
          expires_at: license.expires_at ? license.expires_at.toISOString() : ''
        }))
      };
    }
  }

  return {
    can_drive: false,
    reason: 'Driver does not have valid license for this vehicle type',
    matching_licenses: []
  };
}
}