// src/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import * as bcrypt from 'bcryptjs';
import { LoginResponse, ResetPasswordRequest, ResetPasswordResponse, UserResponse } from './types/auth.types';
import { of, Observable, from, lastValueFrom, catchError } from 'rxjs';
import { UserServiceClient, GetUserByEmailRequest, UpdatePasswordRequest, UpdateFullnameRequest } from './types/user.client';
import { InjectRepository } from '@nestjs/typeorm';
import { VerificationToken } from './entities/verification-token.entity';
import { randomUUID } from 'crypto';
import { EmailService, PasswordRecoveryRequest, PasswordRecoveryResponse } from './types/email.client';
import { MoreThan, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { safeGrpcCall } from './common/auth/utils/grpc-call.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly grpcFactory: GrpcClientFactory,
    private readonly jwt: JwtService,
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepository: Repository<VerificationToken>,
  ) { }

  // Cliente gRPC para el servicio de usuarios.
  private async userClient(): Promise<UserServiceClient> {
    const client = await this.grpcFactory.clientFor(
      'USERS-SERVICE', // nombre de la app en eureka
      'users', // package (de. proto)
      'users.proto', // archivo .proto
    );

    // Aqui ('UserService') debe coincidir con el nombre del servicio en el archivo .proto
    return client.getService<UserServiceClient>('UserService');
  }

  private async emailClient(): Promise<EmailService> {
    const client = await this.grpcFactory.clientFor(
      'EMAIL-SERVICE',
      'email',
      'email.proto',
    );

    return client.getService<EmailService>('EmailService');
  }

  public login(email: string, password: string): Observable<LoginResponse> {
    return from(this.doLogin(email, password));
  }

  private async doLogin(email: string, password: string): Promise<LoginResponse> {
    const client = await this.userClient();

    const emailRequest: GetUserByEmailRequest = { email };

    const user = await safeGrpcCall(client.getUserByEmail(emailRequest), 'AuthService.getUserByEmail');

    if (!user?.userId || !user.password) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Credenciales inválidas',
      });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Credenciales inválidas',
      });
    }

    const payload = {
      sub: user.userId,
      email: user.email,
      roles: user.roles ?? [],
    };

    const token = this.jwt.sign(payload);

    const response: LoginResponse = {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '3600',
    };

    return response;
  }

  public async recoverPassword(email: string): Promise<PasswordRecoveryResponse> {

    // Verificando que el usuario exista.
    const client = await this.userClient();
    const emailRequest: GetUserByEmailRequest = { email };

    const user = await safeGrpcCall(client.getUserByEmail(emailRequest), 'UserService.GetUserByEmail');

    // Generar token y guardarlo en la base de datos.
    const token = await this.generateForUser(Number(user.userId));

    // gRPC para enviar el correo.
    const emailClient = await this.emailClient();
    const request: PasswordRecoveryRequest = { email, token: token.tokenHash };

    const emailResponse = await safeGrpcCall(emailClient.sendPasswordRecoveryEmail(request), 'EmailService.SendPasswordRecoveryEmail');

    return emailResponse;
  }

  private async generateForUser(userId: number): Promise<VerificationToken> {

    // Voy a asumir directamente que el usuario existe, porque esta función se llama después de verificar eso.
    const expirationTime = 10; // minutos
    const verificationToken = this.verificationTokenRepository.create({
      userId,
      tokenHash: randomUUID(),
      expiresAt: this.minutesFromNow(expirationTime),
      used: false,
    });

    return await this.verificationTokenRepository.save(verificationToken);
  }

  private minutesFromNow(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  public async resetPassword(tokenRequest: string, newPassword: string): Promise<ResetPasswordResponse> {
    // Verificar validez del token (que no este usado y expirado)
    const token = await this.verificationTokenRepository.findOne({
      where: {
        tokenHash: tokenRequest,
      },
    });

    if (!token || token.used || token.expiresAt < new Date()) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Token inválido o expirado',
      });
    }

    // Actualizar contrasena en la base de datos.
    const userClient = await this.userClient();
    const user = await safeGrpcCall(userClient.getUser({ userId: token.userId }), "UserService.GetUser");

    if (!user || !user.userId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Usuario no encontrado',
      });
    }

    const updatePasswordRequest: UpdatePasswordRequest = { userId: user.userId, newPassword };

    const updatedResponse = await safeGrpcCall(userClient.updatePassword(updatePasswordRequest), "UserService.UpdatePassword");

    if (!updatedResponse.success) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'No se pudo actualizar la contraseña',
      });
    }

    // Invalidar token.
    token.used = true;
    await this.verificationTokenRepository.save(token);

    // Respuesta al cliente.
    const response$: ResetPasswordResponse = {
      success: true,
      message: 'Contraseña actualizada correctamente',
    };

    return response$;
  }

  public async me(data: {}, metadata: Metadata): Promise<UserResponse> {

    const client = await this.userClient();

    const rawAuth = metadata.getMap()['authorization'];

    if (!rawAuth) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'No se proporcionó token de autenticación',
      });
    }

    const auth =
      typeof rawAuth === 'string'
        ? rawAuth
        : rawAuth instanceof Buffer
          ? rawAuth.toString()
          : String(rawAuth);


    const token = auth.replace('Bearer ', '');

    if (!token) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'No se proporcionó token de autenticación',
      });
    }

    try {
      const payload = this.jwt.verify(token);
      const email = payload.email;
      const emailRequest: GetUserByEmailRequest = { email };
      const user = await lastValueFrom(client.getUserByEmail(emailRequest));

      const roles: string[] = user?.roles.map(role => {
        return role.name;
      }) ?? [];

      const response: UserResponse = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        username: user.username,
        roles: roles,
      }

      return response;
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'Token inválido',
      });
    }
  }

  public async updateFullname(data: { userId: number, firstName: string, lastName: string }, metadata: Metadata): Promise<UserResponse> {

    const client = await this.userClient();

    const updateRequest: UpdateFullnameRequest = {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
    };

    const response = await lastValueFrom(client.updateFullname(updateRequest, metadata));

    const roles: string[] = response?.roles.map(role => {
      return role.name;
    }) ?? [];

    const userResponse: UserResponse = {
      userId: response.userId,
      firstName: response.firstName,
      lastName: response.lastName,
      email: response.email,
      phone: response.phone,
      username: response.username,
      roles: roles,
    };

    return userResponse;
  }

  public async justForTest(
    data: { message: string },
    metadata: Metadata,
  ): Promise<any> {

    const client = await this.userClient();
    return await lastValueFrom(client.getAllUsers({}, metadata));
  }
}
