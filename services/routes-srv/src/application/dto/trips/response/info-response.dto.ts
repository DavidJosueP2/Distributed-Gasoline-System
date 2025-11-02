export interface VehicleInfoDto {
  id: number;
  plate: string;
  requiredLicenses?: string[];
}

export interface DriverInfoDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SupervisorInfoDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}
