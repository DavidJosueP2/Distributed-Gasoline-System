import { RoleResponseDto } from './user-response';

export default interface FindUserByEmailResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  username: string;
  password: string;
  roles: RoleResponseDto[];
}
