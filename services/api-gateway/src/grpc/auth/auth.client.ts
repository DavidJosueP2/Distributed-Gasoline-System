import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';


export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface RecoverPasswordRequest {
  email: string;
}

export interface RecoverPasswordResponse {
  message: string;
}

export interface AuthServiceClient {
  login(data: LoginRequest): Observable<LoginResponse>;
  justForTest(data: {}, metadata?: Metadata): Observable<any>;
  recoverPassword(data: RecoverPasswordRequest): Observable<RecoverPasswordResponse>;
}
