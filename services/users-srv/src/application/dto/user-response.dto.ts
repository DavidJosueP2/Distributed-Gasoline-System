export interface RoleResponseDto {
  id: number;
  name: string;
}

export interface UserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  username: string;
  status: string;
  roles: RoleResponseDto[];
}
