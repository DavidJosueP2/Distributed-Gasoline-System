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

export interface AuthServiceClient {
  Login(data: LoginRequest): Observable<LoginResponse>;
}
