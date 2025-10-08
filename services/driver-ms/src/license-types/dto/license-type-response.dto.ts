export class LicenseTypeResponseDto {
  license_type_id: number;
  code: string;
  description?: string;
  is_professional: boolean;
  created_at: Date;

  constructor(partial: Partial<LicenseTypeResponseDto>) {
    Object.assign(this, partial);
  }
}
