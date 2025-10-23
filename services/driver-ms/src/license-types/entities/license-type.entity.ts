import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { DriverLicense } from '../../drivers/entities/driver-license.entity';
import { LicenseInclude } from './license-include.entity';

@Entity('license_types')
export class LicenseType {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  license_type_id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_professional: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  // Relaciones
  @OneToMany(() => LicenseInclude, (include) => include.parentLicenseType)
  parentIncludes: LicenseInclude[];

  @OneToMany(() => LicenseInclude, (include) => include.childLicenseType)
  childIncludes: LicenseInclude[];

  @OneToMany(() => DriverLicense, (driverLicense) => driverLicense.licenseType)
  driverLicenses: DriverLicense[];
}
