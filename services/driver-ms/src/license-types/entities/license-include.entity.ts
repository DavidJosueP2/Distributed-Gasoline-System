import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { LicenseType } from './license-type.entity';

@Index('idx_license_includes_parent', ['parent_license_type_id'])
@Index('idx_license_includes_child', ['child_license_type_id'])
@Entity('license_includes')
export class LicenseInclude {
  @PrimaryColumn({ name: 'parent_license_type_id', type: 'bigint' })
  parent_license_type_id: number;

  @PrimaryColumn({ name: 'child_license_type_id', type: 'bigint' })
  child_license_type_id: number;

  @ManyToOne(() => LicenseType, (licenseType) => licenseType.parentIncludes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_license_type_id' })
  parentLicenseType: LicenseType;

  @ManyToOne(() => LicenseType, (licenseType) => licenseType.childIncludes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'child_license_type_id' })
  childLicenseType: LicenseType;
}
