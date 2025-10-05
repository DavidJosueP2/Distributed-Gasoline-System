export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;  // Cambiado de access_token a accessToken
  tokenType: string;    // Cambiado de token_type a tokenType
  expiresIn: string;    // Cambiado de expires_in a expiresIn
}
