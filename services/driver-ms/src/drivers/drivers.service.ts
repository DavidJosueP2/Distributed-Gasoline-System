import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver, DriverAvailability } from './entities/driver.entity';
import { LicenseTypesService } from '../license-types/license-types.service';
import { DriverLicense } from '../driver-licenses/entities/driver-license.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly licenseTypesService: LicenseTypesService,
  ) {}

  // Método para convertir IDs de gRPC
  private convertGrpcId(id: any): number {
    if (typeof id === 'object' && id !== null && 'low' in id) {
      return Number(id.low) || 0;
    }
    return Number(id) || 0;
  }

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    const driver = this.driverRepository.create(
      createDriverDto as DeepPartial<Driver>,
    );
    return await this.driverRepository.save(driver);
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
  const driver = await this.findOne(convertedId);

  // Convertir availability de número a string si es necesario
  if (updateDriverDto.availability !== undefined) {
    // Si viene como número del enum, convertirlo a string
    updateDriverDto.availability = this.mapProtoAvailabilityToString(updateDriverDto.availability);
  }

  Object.assign(driver, updateDriverDto);
  return await this.driverRepository.save(driver);
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