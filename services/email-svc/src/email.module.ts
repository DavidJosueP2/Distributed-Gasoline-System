import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { MailSenderService } from './services/mail-sender-service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, MailSenderService],
})
export class EmailModule { }
