import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

export interface AuthServiceClient {
  login(data: LoginRequest): Observable<LoginResponse>;
  justForTest(data: {}, metadata?: Metadata): Observable<any>;
  recoverPassword(data: PasswordRecoveryRequest): Observable<PasswordRecoveryResponse>;
  resetPassword(data: ResetPasswordRequest): Observable<ResetPasswordResponse>;
  me(data: {}, metadata?: Metadata): Observable<UserResponse>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  roles: string[];
}