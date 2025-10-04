import { Observable } from 'rxjs';

export interface LicenseInclude { 
  parent_license_type_id: number; 
  child_license_type_id: number; 
}

export interface DriverLicense {
  driver_license_id: number;
  driver_id: number;
  license_type_id: number;
  number: string;
  issued_at: string;
  expires_at: string;
  status: number; // 1=VALID, 2=EXPIRED, 3=SUSPENDED
  version: number;
}

export interface LicenseType {
  license_type_id: number;
  code: string;
  description: string;
  is_professional: boolean;
  created_at: string;
  parent_includes: LicenseInclude[];
  child_includes: LicenseInclude[];
  driver_licenses: DriverLicense[];
}

export interface LicenseTypeList { 
  items: LicenseType[];
}

export interface LicenseTypesServiceClient {
    Create(data: { code: string; description?: string; is_professional?: boolean }, metadata?: any): Observable<LicenseType>;
    FindAll(data: {}, metadata?: any): Observable<LicenseTypeList>;
    FindOne(data: { id: number }, metadata?: any): Observable<LicenseType>;
    FindByCode(data: { code: string }, metadata?: any): Observable<LicenseType>;
    Update(data: { id: number; code?: string; description?: string; is_professional?: boolean }, metadata?: any): Observable<LicenseType>;
    Remove(data: { id: number }, metadata?: any): Observable<{ success: boolean }>;
    AddInclusion(data: { parent_id: number; child_id: number }, metadata?: any): Observable<LicenseInclude>;
    RemoveInclusion(data: { parent_id: number; child_id: number }, metadata?: any): Observable<{ success: boolean }>;
    GetClosure(data: { license_type_id: number }, metadata?: any): Observable<{ child_ids: number[] }>;
}
