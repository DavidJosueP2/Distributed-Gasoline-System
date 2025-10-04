import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

// Mensajes (Request / Response)

export interface GetUserByEmailRequest {
  email: string;
}

export interface RoleResponse {
  roleId: number;
  name: string;
}

export interface GetUserByEmailResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  roles: RoleResponse[];
}

export interface Empty { }

export interface UserIdRequest {
  userId: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  status: string;
  roleIds: number[];
}

export interface UpdateUserRequest {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  status: string;
  roleIds: number[];
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  status: string;
  roles: RoleResponse[];
}

export interface UserList {
  items: UserResponse[];
}

export interface DeleteResponse {
  success: boolean;
}

// Interfaz del servicio gRPC con Observables

export interface UserServiceClient {
  getUser(req: UserIdRequest): Observable<UserResponse>;

  getUserByEmail(req: GetUserByEmailRequest): Observable<GetUserByEmailResponse>;

  getAllUsers(req: Empty, metadata?: Metadata): Observable<UserList>;

  createUser(req: CreateUserRequest): Observable<UserResponse>;

  updateUser(req: UpdateUserRequest): Observable<UserResponse>;

  deleteUser(req: UserIdRequest): Observable<DeleteResponse>;
}
