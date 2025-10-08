import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Driver } from './driver.entity';
import { LicenseType } from '../../license-types/entities/license-type.entity';

export enum LicenseStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('driver_licenses')
@Index('idx_driver_licenses_driver', ['driver_id'])
@Index('idx_driver_licenses_license', ['license_type_id'])
@Index('idx_driver_licenses_expiry', ['status', 'expires_at'])
export class DriverLicense {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  driver_license_id: number;

  @Column({ name: 'driver_id' })
  driver_id: number;

  @Column({ name: 'license_type_id' })
  license_type_id: number;

  @Column({ type: 'varchar', length: 40, unique: true, nullable: true })
  number: string;

  @Column({ type: 'date', nullable: true })
  issued_at: Date;

  @Column({ type: 'date', nullable: true })
  expires_at: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: LicenseStatus.VALID,
  })
  status: LicenseStatus;

  @Column({ type: 'bigint', default: 0 })
  version: number;

  // Relaciones
  @ManyToOne(() => Driver, (driver) => driver.licenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => LicenseType, (licenseType) => licenseType.driverLicenses)
  @JoinColumn({ name: 'license_type_id' })
  licenseType: LicenseType;
}
