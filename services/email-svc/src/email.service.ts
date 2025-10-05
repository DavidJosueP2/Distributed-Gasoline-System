import { Injectable } from '@nestjs/common';
import { PasswordRecoveryResponse } from './types/email.types';
import { MailSenderService } from './services/mail-sender-service';

@Injectable()
export class EmailService {

  public constructor(private readonly mailSenderService: MailSenderService) {
  }

  public sendPasswordRecoveryEmail(email: string, token: string): Promise<PasswordRecoveryResponse> {

    return this.mailSenderService.sendPasswordRecoveryEmail(email, token);
  }

}