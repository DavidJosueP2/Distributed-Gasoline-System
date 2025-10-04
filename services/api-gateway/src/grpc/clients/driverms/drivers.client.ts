import { Observable } from 'rxjs';

export interface Driver {
    driver_id: number;
    user_id: number;
    availability?: number; // enum DriverAvailability
    version?: number;
    created_at?: string;
    updated_at?: string;
}

export interface DriverList { items: Driver[] }

export interface DriversServiceClient {
    Create(data: { user_id: number; availability?: number; version?: number }, metadata?: any): Observable<Driver>;
    FindAll(data: {}, metadata?: any): Observable<DriverList>;
    FindOne(data: { id: number }, metadata?: any): Observable<Driver>;
    Update(data: { id: number; user_id?: number; availability?: number; version?: number }, metadata?: any): Observable<Driver>;
    Remove(data: { id: number }, metadata?: any): Observable<{ success: boolean }>;
    CanDrive(data: { driver_id: number; license_type_id: number }, metadata?: any): Observable<{ can_drive: boolean }>;
}
