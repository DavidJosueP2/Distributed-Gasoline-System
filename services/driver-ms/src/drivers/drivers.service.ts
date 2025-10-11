import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver, DriverAvailability } from './entities/driver.entity';
import { LicenseTypesService } from '../license-types/license-types.service';
import { DriverLicense } from '../driver-licenses/entities/driver-license.entity';
import { UsersGrpcClient } from './users-grpc.client';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly licenseTypesService: LicenseTypesService,
    private readonly usersGrpcClient: UsersGrpcClient,
  ) {}

  // Método para convertir IDs de gRPC
  private convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null && 'low' in id) {
      return Number(id.low) || 0;
    }
    return Number(id) || 0;
  }

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    this.logger.log(`Creating driver for user_id: ${createDriverDto.user_id}`);
    
    try {
      // Validar que el user_id existe en users-srv
      await this.usersGrpcClient.getUser(createDriverDto.user_id);
      this.logger.log(`User ${createDriverDto.user_id} validated successfully`);

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
      relations: ['licenses', 'licenses.license_type'],
    });
  }

  // Cambiar a any pero convertir antes de usar
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

  // Cambiar a any pero convertir antes de usar
  async update(id: any, updateDriverDto: UpdateDriverDto): Promise<Driver> {
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
        this.logger.log(`Validating new user_id ${updateDriverDto.user_id} via gRPC`);
        await this.usersGrpcClient.getUser(updateDriverDto.user_id);
        driver.user_id = updateDriverDto.user_id;
        this.logger.log(`User ${updateDriverDto.user_id} validated successfully`);
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
  async remove(id: any): Promise<void> {
    const convertedId = this.convertGrpcId(id);
    const result = await this.driverRepository.delete(convertedId);

    if (result.affected === 0) {
      throw new NotFoundException(`Driver with ID ${convertedId} not found`);
    }
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
    where: { driver_id: convertedDriverId },
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