import { Injectable } from '@nestjs/common';
import { PasswordRecoveryResponse } from './types/email.types';

@Injectable()
export class EmailService {
  public sendPasswordRecoveryEmail(email: string, token: string): Promise<PasswordRecoveryResponse> {

    const response: PasswordRecoveryResponse = {
      success: true,
      message: `Correo de recuperación enviado a ${email} con el token ${token}`,
    };

    return Promise.resolve(response);
  }
}