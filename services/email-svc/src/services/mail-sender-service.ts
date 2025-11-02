import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PasswordRecoveryResponse } from 'src/types/email.types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class MailSenderService {

  private readonly logger = new Logger(MailSenderService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // true para puerto 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public async sendPasswordRecoveryEmail(email: string, token: string): Promise<PasswordRecoveryResponse> {

    const frontendUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Soporte:" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Recuperación de Contraseña",
      html: `
        <h3>Hola.</h3>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para continuar:</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p><i>Este enlace expirará en 10 minutos.</i></p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        message: 'Correo de recuperación enviado',
      };
    } catch (err) {
      throw new RpcException({
        code: err.code,
        message: err.details || err.message || 'Error remoto',
      });
    }



  }

}
