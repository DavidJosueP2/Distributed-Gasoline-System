import { Observable } from 'rxjs';

export type LongObject = {
    low: number;
    high: number;
    unsigned?: boolean;
    toNumber?: () => number;
};

type LongLike = string | number | LongObject;

export interface RoleResponse {
    roleId: LongLike;
    name: string;
}

export interface UserResponse {
    userId: LongLike;
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

export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    roleIds: LongLike[];
}

export interface UpdateUserRequest {
    userId: LongLike;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    password: string;
    status: string;
    roleIds: LongLike[];
}

export interface UserServiceClient {
    GetUser(data: { userId: LongLike }, metadata?: any): Observable<UserResponse>;
    GetAllUsers(data: object, metadata?: any): Observable<UserList>;
    CreateUser(data: CreateUserRequest, metadata?: any): Observable<UserResponse>;
    UpdateUser(data: UpdateUserRequest, metadata?: any): Observable<UserResponse>;
    DeleteUser(data: { userId: LongLike }, metadata?: any): Observable<{ success: boolean }>;
    UnDeleteUser(data: { userId: LongLike }, metadata?: any): Observable<{ success: boolean }>;
}
