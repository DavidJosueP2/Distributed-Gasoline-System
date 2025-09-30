import { Body, Controller, Post } from '@nestjs/common';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import { lastValueFrom } from 'rxjs';
import {
  AuthServiceClient,
} from 'src/grpc/auth/auth.client';

import type {
  LoginRequest,
  LoginResponse,
} from 'src/grpc/auth/auth.client';

@Controller('auth')
export class AuthController {
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
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    const authSvc = await this.client();
    return lastValueFrom(authSvc.Login(dto));
  }
}
