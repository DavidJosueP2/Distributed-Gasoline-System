export interface LicenseIncludeResponse {
    parent_license_type_id: number;
    child_license_type_id: number;
}

export interface DriverLicenseResponse {
    driver_license_id: number;
    driver_id: number;
    license_type_id: number;
    number: string;
    issued_at: string;
    expires_at: string;
    status: string; // 'VALID' | 'EXPIRED' | 'SUSPENDED'
    version: number;
}

export interface LicenseTypeResponse {
    license_type_id: number;
    code: string;
    description: string;
    is_professional: boolean;
    created_at: string;
    parentIncludes: LicenseIncludeResponse[];
    childIncludes: LicenseIncludeResponse[];
    driverLicenses: DriverLicenseResponse[];
}