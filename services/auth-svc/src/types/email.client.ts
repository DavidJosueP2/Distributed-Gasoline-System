import { Observable } from "rxjs";

export interface EmailService {
  sendPasswordRecoveryEmail(req: PasswordRecoveryRequest): Observable<PasswordRecoveryResponse>;
}

export interface PasswordRecoveryRequest {
  email: string;
  token: string;
}
export interface PasswordRecoveryResponse {
  success: boolean;
  message: string;
}