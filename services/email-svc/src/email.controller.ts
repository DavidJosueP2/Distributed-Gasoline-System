import { Controller, Get } from '@nestjs/common';
import { EmailService } from './email.service';
import { GrpcMethod } from '@nestjs/microservices';
import type { PasswordRecoveryRequest, PasswordRecoveryResponse } from './types/email.types';

@Controller()
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

  @GrpcMethod('EmailService', 'SendPasswordRecoveryEmail')
  sendPasswordRecoveryEmail(data: PasswordRecoveryRequest): Promise<PasswordRecoveryResponse> {
    return this.emailService.sendPasswordRecoveryEmail(data.email, data.token);
  }
}
