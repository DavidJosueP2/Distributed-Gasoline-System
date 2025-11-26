import { Observable } from 'rxjs';

// License status enum values
export enum LicenseStatus {
  LICENSE_STATUS_UNSPECIFIED = 0,
  VALID = 1,
  EXPIRED = 2,
  SUSPENDED = 3,
}

export interface DriverLicense {
  driver_license_id: number;
  driver_id: number;
  license_type_id: number;
  number: string;
  issued_at: string;
  expires_at: string;
  status: LicenseStatus;
  version: number;
  license_type_code?: string;
  license_type_description?: string;
  is_active?: boolean;
}

export interface DriverLicenseList {
  items: DriverLicense[];
}

export interface DriverLicensesServiceClient {
  Create(
    data: {
      driver_id: number;
      license_type_id: number;
      number: string;
      issued_at: string;
      expires_at: string;
      status?: LicenseStatus;
    }, 
    metadata?: any
  ): Observable<DriverLicense>;

  FindByDriver(
    data: { driver_id: number }, 
    metadata?: any
  ): Observable<DriverLicenseList>;

  Suspend(
    data: { 
      driver_id: number; 
      license_id: number;
    }, 
    metadata?: any
  ): Observable<DriverLicense>;

  Reactivate(
    data: { 
      driver_id: number; 
      license_id: number;
    }, 
    metadata?: any
  ): Observable<DriverLicense>;

  Update(
    data: {
      driver_id: number;
      license_id: number;
      license_type_id?: number;
      number?: string;
      issued_at?: string;
      expires_at?: string;
      status?: LicenseStatus;
    },
    metadata?: any
  ): Observable<DriverLicense>;

  FindActiveByDriver(
    data: { driver_id: number }, 
    metadata?: any
  ): Observable<DriverLicenseList>;
}
