import { Observable } from 'rxjs';

// =====================
// Enums
// =====================

export enum DriverAvailability {
  DRIVER_AVAILABILITY_UNSPECIFIED = 0,
  AVAILABLE = 1,
  ON_ROUTE = 2,
  LICENSE_EXPIRED = 3,
  INACTIVE = 4,
}

export enum LicenseStatus {
  LICENSE_STATUS_UNSPECIFIED = 0,
  VALID = 1,
  EXPIRED = 2,
  SUSPENDED = 3,
}

// =====================
// Common Types
// =====================

export interface LicenseInclude {
  parentLicenseTypeId: number;
  childLicenseTypeId: number;
}

export interface DriverLicense {
  driverLicenseId: number;
  driverId: number;
  licenseTypeId: number;
  number: string;
  issuedAt: string;
  expiresAt: string;
  status: LicenseStatus;
  version: number;
  licenseTypeCode?: string;
  licenseTypeDescription?: string;
  isActive?: boolean;
}

export interface LicenseType {
  licenseTypeId: number;
  code: string;
  description?: string;
  isProfessional?: boolean;
  createdAt: string;
  parentIncludes?: LicenseInclude[];
  childIncludes?: LicenseInclude[];
  driverLicenses?: DriverLicense[];
}

export interface DriverSummary {
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  suspendedLicenses: number;
  licenseTypes: string[];
}

export interface Driver {
  driverId: number;
  userId: number;
  availability: DriverAvailability;
  version: number;
  createdAt: string;
  updatedAt: string;
  licenses?: DriverLicense[];
  summary?: DriverSummary;
}

// =====================
// Request/Response Types
// =====================

export interface CreateDriverRequest {
  userId: number;
  availability?: DriverAvailability;
  version?: number;
}

export interface FindAllDriversRequest {
  // Empty request
}

export interface DriversList {
  drivers: Driver[];
  total: number;
}

export interface FindOneDriverRequest {
  id: number;
}

export interface UpdateDriverRequest {
  id: number;
  userId?: number;
  availability?: DriverAvailability;
  version?: number;
}

export interface RemoveDriverRequest {
  id: number;
}

export interface RemoveDriverResponse {
  success: boolean;
}

export interface CanDriveRequest {
  driverId: number;
  licenseTypeId: number;
}

export interface MatchingLicense {
  licenseId: number;
  licenseType: string;
  expiresAt: string;
}

export interface CanDriveResponse {
  canDrive: boolean;
  reason: string;
  matchingLicenses: MatchingLicense[];
}

// =====================
// Service Client Interface
// =====================

export interface DriversServiceClient {
  Create(
    data: CreateDriverRequest,
    metadata?: any,
  ): Observable<Driver>;

  FindAll(
    data: FindAllDriversRequest,
    metadata?: any,
  ): Observable<DriversList>;

  FindOne(
    data: FindOneDriverRequest,
    metadata?: any,
  ): Observable<Driver>;

  Update(
    data: UpdateDriverRequest,
    metadata?: any,
  ): Observable<Driver>;

  Remove(
    data: RemoveDriverRequest,
    metadata?: any,
  ): Observable<RemoveDriverResponse>;

  CanDrive(
    data: CanDriveRequest,
    metadata?: any,
  ): Observable<CanDriveResponse>;
}

