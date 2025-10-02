import { Body, Controller, Post, Logger, Req, Get, UseGuards } from '@nestjs/common';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import {
  AuthServiceClient,
} from 'src/grpc/auth/auth.client';
import type {
  LoginRequest,
  LoginResponse,
} from 'src/grpc/auth/auth.client';
import { lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Public } from '../../common/auth/decorators/public.decorator';

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

  @Public()
  @Post('log-in')
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    const client = await this.client();
    const result = await lastValueFrom(
      client.Login(dto).pipe(
        catchError((error) => {
          this.logger.error('Error en comunicación gRPC:', error);
          throw error;
        }),
      ),
    );

    return result;
  }

  @Get("test")
  async test(@Req() req): Promise<any> {
    const client = await this.client();
    const result = await lastValueFrom(client.TestMetadata({ message: 'Hello from API-Gateway' }, req._grpcMetadata));
    return result;
  }

}
