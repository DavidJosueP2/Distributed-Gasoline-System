import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

export interface TestRequest {
  message: string;
}

export interface TestResponse {
  message: string;
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

export interface AuthServiceClient {
  Login(data: LoginRequest): Observable<LoginResponse>;
  TestMetadata(data: TestRequest, metadata?: Metadata): Observable<TestResponse>;
}
