import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity';
import { LicenseType } from '../../license-types/entities/license-type.entity';

@Entity('driver_licenses')
export class DriverLicense {
  @PrimaryGeneratedColumn({ name: 'driver_license_id' })
  driver_license_id: number;

  @ManyToOne(() => Driver, (driver) => driver.licenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'driver_id' })
  driver_id: number;

  @ManyToOne(() => LicenseType, { eager: true })
  @JoinColumn({ name: 'license_type_id' })
  license_type: LicenseType;

  @Column({ name: 'license_type_id' })
  license_type_id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  number: string;

  @Column({ type: 'date', name: 'issued_at' })
  issued_at: Date;

  @Column({ type: 'date', name: 'expires_at' })
  expires_at: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'VALID',
    enum: ['VALID', 'EXPIRED', 'SUSPENDED'],
  })
  status: string;

  @VersionColumn({ name: 'version', default:0 })
  version: number;

  // Helper method to check if license is active
  isActive(): boolean {
    const today = new Date();
    return this.status === 'VALID' && this.expires_at >= today;
  }
}
