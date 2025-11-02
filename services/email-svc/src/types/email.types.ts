export interface PasswordRecoveryRequest {
  email: string;
  token: string;
}
export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
}
