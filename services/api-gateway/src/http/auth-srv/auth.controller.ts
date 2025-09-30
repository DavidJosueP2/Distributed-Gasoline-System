import { Body, Controller, Post, Logger } from '@nestjs/common';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import {
  AuthServiceClient,
} from 'src/grpc/auth/auth.client';
import type {
  LoginRequest,
  LoginResponse,
} from 'src/grpc/auth/auth.client';
import { LoginDto } from '../../dto/login.dto';
import { lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly factory: GrpcClientFactory) { }

  private async client(): Promise<AuthServiceClient> {
    const client = await this.factory.forService(
      'AUTH-SERVICE',
      'auth',
      'auth.proto',
    );
    return client.getService<AuthServiceClient>('AuthService');
  }

  @Post('log-in')
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    const client = await this.client();

    // Convertir DTO a LoginRequest para gRPC
    const loginRequest: LoginRequest = {
      email: dto.email,
      password: dto.password,
    };

    const result = await lastValueFrom(
      client.Login(loginRequest).pipe(
        catchError((error) => {
          this.logger.error('Error en comunicación gRPC:', error);
          throw error;
        }),
      ),
    );

    return result;
  }
}
