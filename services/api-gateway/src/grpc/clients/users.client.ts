import { Observable } from 'rxjs';

type LongLike = string | number;

export interface RoleResponse {
    role_id: LongLike;
    name: string;
}

export interface UserResponse {
    user_id: LongLike;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    username: string;
    status: string;
    roles: RoleResponse[];
}

export interface UserList {
    items: UserResponse[];
}

export interface CreateUserRequest {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    username: string;
    password: string;
    status?: string;
    role_ids?: LongLike[];
}

export interface UpdateUserRequest {
    user_id: LongLike;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    status?: string;
    role_ids?: LongLike[];
}

export interface UserServiceClient {
    GetUser(data: { user_id: LongLike }, metadata?: any): Observable<UserResponse>;
    GetAllUsers(data: object, metadata?: any): Observable<UserList>;
    CreateUser(data: CreateUserRequest, metadata?: any): Observable<UserResponse>;
    UpdateUser(data: UpdateUserRequest, metadata?: any): Observable<UserResponse>;
    DeleteUser(data: { user_id: LongLike }, metadata?: any): Observable<{ success: boolean }>;
}
