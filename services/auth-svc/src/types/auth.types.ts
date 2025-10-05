import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequest {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}

export interface LoginResponse {
  accessToken: string;  // Cambiado de access_token a accessToken
  tokenType: string;    // Cambiado de token_type a tokenType
  expiresIn: string;    // Cambiado de expires_in a expiresIn
}

export class PasswordRecoveryRequest {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  email: string;
}

export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
}

export class ResetPasswordRequest {
  @IsString({ message: 'El token debe ser texto.' })
  token: string;

  @IsString({ message: 'La nueva contraseña debe ser texto.' })
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}