import { Observable } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
}

export interface AuthServiceClient {
  Login(data: LoginRequest): Observable<LoginResponse>;
}
