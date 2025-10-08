import { DriverLicense } from '../../driver-licenses/entities/driver-license.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum DriverAvailability {
  AVAILABLE = 'AVAILABLE',
  ON_ROUTE = 'ON_ROUTE',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  INACTIVE = 'INACTIVE',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  driver_id: number;

  @Column({ type: 'bigint', unique: true })
  user_id: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: DriverAvailability.AVAILABLE,
  })
  @Index('idx_drivers_availability')
  availability: DriverAvailability;

  @Column({ type: 'bigint', default: 0 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at: Date;

  @OneToMany(() => DriverLicense, (driverLicense) => driverLicense.driver)
  licenses: DriverLicense[];
}
