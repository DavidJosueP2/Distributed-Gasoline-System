export class LicenseIncludeResponseDto {
  parent_license_type_id: number;
  child_license_type_id: number;
  parentLicenseType?: any; // Puedes tipar esto más específicamente
  childLicenseType?: any; // Puedes tipar esto más específicamente

  constructor(partial: Partial<LicenseIncludeResponseDto>) {
    Object.assign(this, partial);
  }
}
