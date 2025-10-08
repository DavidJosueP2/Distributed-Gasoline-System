export interface DriverLicenseInfo {
  driver_license_id: number;
  license_type_id: number;
  license_type_code: string;
  license_type_description: string;
  number: string;
  issued_at: string;
  expires_at: string;
  status: 'VALID' | 'EXPIRED' | 'SUSPENDED';
  is_active: boolean;
  days_until_expiry?: number;
}

export interface DriverResponse {
  driver_id: number;
  user_id: number;
  availability: 'AVAILABLE' | 'ON_ROUTE' | 'LICENSE_EXPIRED' | 'INACTIVE';
  version: number;
  created_at: string;
  updated_at: string;
  licenses: DriverLicenseInfo[];
  summary: {
    total_licenses: number;
    active_licenses: number;
    expired_licenses: number;
    suspended_licenses: number;
    license_types: string[];
  };
}

export interface DriversListResponse {
  drivers: DriverResponse[];
  total: number;
  page?: number;
  limit?: number;
}

export interface DriverSummaryResponse {
  driver_id: number;
  user_id: number;
  availability: string;
  license_ids: number[];
  active_license_ids: number[];
  license_types: string[];
  can_drive_professionally: boolean;
}

export interface CanDriveResponse {
  can_drive: boolean;
  reason?: string;
  matching_licenses?: {
    license_id: number;
    license_type: string;
    expires_at: string;
  }[];
}