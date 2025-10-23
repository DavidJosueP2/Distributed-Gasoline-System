import { Observable } from 'rxjs';

// Driver availability enum values
export enum DriverAvailability {
    DRIVER_AVAILABILITY_UNSPECIFIED = 0,
    AVAILABLE = 1,
    ON_ROUTE = 2,
    LICENSE_EXPIRED = 3,
    INACTIVE = 4,
}

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

export interface DriverSummary {
    total_licenses: number;
    active_licenses: number;
    expired_licenses: number;
    suspended_licenses: number;
    license_types: string[];
}

export interface Driver {
    driver_id: number;
    user_id: number;
    availability: DriverAvailability;
    version: number;
    created_at: string;
    updated_at: string;
    licenses?: DriverLicense[];
    summary?: DriverSummary;
}

export interface DriversList {
    drivers: Driver[];
    total: number;
}

export interface MatchingLicense {
    license_id: number;
    license_type: string;
    expires_at: string;
}

export interface CanDriveResponse {
    can_drive: boolean;
    reason: string;
    matching_licenses: MatchingLicense[];
}

export interface CreateDriverRequest {
    user_id?: number;  // snake_case (legacy)
    userId?: number;   // camelCase (preferred)
    availability?: DriverAvailability;
    version?: number;
}

export interface UpdateDriverRequest {
    id: number;
    user_id?: number;  // snake_case (legacy)
    userId?: number;   // camelCase (preferred)
    availability?: DriverAvailability;
    version?: number;
}

export interface DriversServiceClient {
    Create(data: CreateDriverRequest, metadata?: any): Observable<Driver>;
    FindAll(data: {}, metadata?: any): Observable<DriversList>;
    FindOne(data: { id: number }, metadata?: any): Observable<Driver>;
    Update(data: UpdateDriverRequest, metadata?: any): Observable<Driver>;
    Remove(data: { id: number }, metadata?: any): Observable<{ success: boolean }>;
    CanDrive(data: { driver_id: number; license_type_id: number }, metadata?: any): Observable<CanDriveResponse>;
}

