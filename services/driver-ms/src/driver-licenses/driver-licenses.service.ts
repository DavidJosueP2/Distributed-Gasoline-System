import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { DriverLicense } from './entities/driver-license.entity';
import { CreateDriverLicenseGrpcDto, CreateDriverLicenseHttpDto, UpdateDriverLicenseDto } from './dto';
import { Driver } from '../drivers/entities/driver.entity';

@Injectable()
export class DriverLicensesService {
  constructor(
    @InjectRepository(DriverLicense)
    private driverLicenseRepo: Repository<DriverLicense>,
    @InjectRepository(Driver)
    private driverRepo: Repository<Driver>,
  ) {}

  // 1. POST /drivers/:driverId/licenses
  async createFromHttp(driverId: number, createDto: CreateDriverLicenseHttpDto) {
    // Check if driver exists
    const driver = await this.driverRepo.findOne({
      where: { driver_id: driverId },
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    // Business rule: avoid duplicate license_type for the same driver (historical tracking is by driver_license_id)
    const existingType = await this.driverLicenseRepo.findOne({
      where: { driver_id: driverId, license_type_id: createDto.license_type_id },
    });
    if (existingType) {
      throw new ConflictException(
        `Driver ${driverId} already has a license with type ${createDto.license_type_id}`,
      );
    }

    // Check if license number already exists
    const existingLicense = await this.driverLicenseRepo.findOne({
      where: { number: createDto.number },
    });
    if (existingLicense) {
      throw new ConflictException('License number already exists');
    }

    // Validate dates
    const issuedAt = new Date(createDto.issued_at);
    const expiresAt = new Date(createDto.expires_at);
    if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      throw new ConflictException('Invalid issued_at or expires_at');
    }
    if (expiresAt < issuedAt) {
      throw new ConflictException('expires_at must be after issued_at');
    }

    const license = this.driverLicenseRepo.create({
      ...createDto,
      driver_id: driverId,
      issued_at: issuedAt,
      expires_at: expiresAt,
      status: createDto.status || 'VALID',
    });

    return await this.driverLicenseRepo.save(license);
  }

  async createFromGrpc(createDto: CreateDriverLicenseGrpcDto) {
  // NUEVO método para gRPC que usa el DTO completo
  const { driver_id, ...rest } = createDto;
  
  // Reutilizar la misma lógica pero con driver_id del DTO
  const driver = await this.driverRepo.findOne({
    where: { driver_id },
  });
  if (!driver) {
    throw new NotFoundException(`Driver with ID ${driver_id} not found`);
  }

  // Business rule: avoid duplicate license_type for the same driver
  const existingType = await this.driverLicenseRepo.findOne({
    where: { driver_id, license_type_id: rest.license_type_id },
  });
  if (existingType) {
    throw new ConflictException(
      `Driver ${driver_id} already has a license with type ${rest.license_type_id}`,
    );
  }

  // Check if license number already exists
  const existingLicense = await this.driverLicenseRepo.findOne({
    where: { number: rest.number },
  });
  if (existingLicense) {
    throw new ConflictException('License number already exists');
  }

  // Validate dates
  const issuedAt = new Date(rest.issued_at);
  const expiresAt = new Date(rest.expires_at);
  if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    throw new ConflictException('Invalid issued_at or expires_at');
  }
  if (expiresAt < issuedAt) {
    throw new ConflictException('expires_at must be after issued_at');
  }

  const license = this.driverLicenseRepo.create({
    ...rest,
    driver_id,
    issued_at: issuedAt,
    expires_at: expiresAt,
    status: rest.status || 'VALID',
  });

  // Guardar y volver a cargar con la relación
  const saved = await this.driverLicenseRepo.save(license);

  // 🔹 Cargar el tipo de licencia relacionado (para code y description)
  const full = await this.driverLicenseRepo.findOne({
    where: { driver_license_id: saved.driver_license_id },
    relations: ['license_type'],
  });

  return full;
}

  // 2. GET /drivers/:driverId/licenses
  async findAllByDriver(driverId: number) {
    return await this.driverLicenseRepo.find({
      where: { driver_id: driverId },
      relations: ['license_type'],
      order: { expires_at: 'DESC' },
    });
  }

  // 3. POST /drivers/:driverId/licenses/:licenseId/suspend
  async suspendLicense(driverId: number, licenseId: number) {
  console.log('🔍 Searching license:', { driverId, licenseId });
  
  // Verificar todas las licencias del driver
  const allDriverLicenses = await this.driverLicenseRepo.find({
    where: { driver_id: driverId },
    select: ['driver_license_id', 'driver_id', 'status', 'number']
  });
  
  console.log('🔍 All licenses for driver', driverId, ':', allDriverLicenses);
  
  const license = await this.driverLicenseRepo.findOne({
    where: { driver_license_id: licenseId, driver_id: driverId },
  });

  if (!license) {
    console.log('❌ License not found. Available licenses:', allDriverLicenses.map(l => l.driver_license_id));
    throw new NotFoundException('License not found for this driver');
  }

  console.log('✅ License found:', license);
  license.status = 'SUSPENDED';
  return await this.driverLicenseRepo.save(license);
}

  // 4. GET /drivers/:driverId/active-licenses
  async findActiveLicenses(driverId: number) {
    const today = new Date();
    return await this.driverLicenseRepo.find({
      where: {
        driver_id: driverId,
        status: 'VALID',
        expires_at: MoreThanOrEqual(today),
      },
      relations: ['license_type'],
      order: { expires_at: 'DESC' },
    });
  }

  async findOne(licenseId: number) {
    const license = await this.driverLicenseRepo.findOne({
      where: { driver_license_id: licenseId },
      relations: ['license_type', 'driver'],
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }
    return license;
  }
}
