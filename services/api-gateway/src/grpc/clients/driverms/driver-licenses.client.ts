import { Observable } from 'rxjs';

export interface DriverLicense {
    driver_license_id: number;
    driver_id: number;
    license_type_id: number;
    number: string;
    issued_at?: string;
    expires_at?: string;
    status?: number; // matches LicenseStatus enum in proto
    version?: number;
}

export interface DriverLicenseList {
    items: DriverLicense[];
}

export interface DriverLicensesServiceClient {
    Create(data: {
        driver_id: number;
        license_type_id: number;
        number?: string;
        issued_at?: string;
        expires_at?: string;
        status?: number;
    }, metadata?: any): Observable<DriverLicense>;
    FindByDriver(data: { driver_id: number }, metadata?: any): Observable<DriverLicenseList>;
    Suspend(data: { driver_id: number; license_id: number }, metadata?: any): Observable<DriverLicense>;
    FindActiveByDriver(data: { driver_id: number }, metadata?: any): Observable<DriverLicenseList>;
}
