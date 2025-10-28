export interface VehicleInfoDto {
  id: number;
  plate: string;
  brand: string;
  family: string;
  year: number;
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
