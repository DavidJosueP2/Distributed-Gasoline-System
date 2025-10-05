// src/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import * as bcrypt from 'bcryptjs';
import { LoginResponse } from './types/auth.types';
import { of, Observable, from, lastValueFrom, catchError } from 'rxjs';
import { UserServiceClient, GetUserByEmailRequest } from './types/user.client';
import { Metadata } from '@grpc/grpc-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly grpcFactory: GrpcClientFactory,
    private readonly jwt: JwtService,
  ) { }

  private async userClient(): Promise<UserServiceClient> {
    const client = await this.grpcFactory.clientFor(
      'USERS-SERVICE', // nombre de la app en eureka
      'users', // package (de. proto)
      'users.proto', // archivo .proto
    );

    // Aqui ('UserService') debe coincidir con el nombre del servicio en el archivo .proto
    return client.getService<UserServiceClient>('UserService');
  }

  public login(email: string, password: string): Observable<LoginResponse> {
    return from(this.doLogin(email, password));
  }

  private async doLogin(email: string, password: string): Promise<LoginResponse> {
    const client = await this.userClient();

    const emailRequest: GetUserByEmailRequest = { email };

    const user = await lastValueFrom(
      client.getUserByEmail(emailRequest).pipe(
        catchError(err => {
          this.logger.error('Error en gRPC:', err);
          throw err;
        }),
      ),
    );

    if (!user?.userId || !user.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.userId,
      email: user.email,
      roles: user.roles ?? [],
    };

    console.log('Auth Service JWT secret:', process.env.JWT_SECRET);
    const token = this.jwt.sign(payload);

    const response: LoginResponse = {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '3600',
    };

    return response;
  }

  public async justForTest(
    data: { message: string },
    metadata: Metadata,
  ): Promise<any> {

    const client = await this.userClient();
    return await lastValueFrom(client.getAllUsers({}, metadata));
  }


}
