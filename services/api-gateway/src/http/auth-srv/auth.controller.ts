import { Body, Controller, Post, Logger, Req, Get, UseGuards } from '@nestjs/common';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import {
  AuthServiceClient,
} from 'src/grpc/auth/auth.client';
import type {
  LoginRequest,
  LoginResponse,
  RecoverPasswordRequest,
  RecoverPasswordResponse,
} from 'src/grpc/auth/auth.client';
import { lastValueFrom, Observable } from 'rxjs';
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
  public async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    const client = await this.client();
    const result = await lastValueFrom(
      client.login(dto).pipe(
        catchError((error) => {
          this.logger.error('Error en comunicación gRPC:', error);
          throw error;
        }),
      ),
    );

    return result;
  }

  @Public()
  @Post("recover-password")
  public async recoverPassword(@Body() dto: RecoverPasswordRequest): Promise<RecoverPasswordResponse> {
    const client = await this.client();
    const result = await lastValueFrom(
      client.recoverPassword(dto).pipe(
        catchError((error) => {
          this.logger.error('Error en comunicación gRPC:', error);
          throw error;
        }),
      ),
    );

    return result;
  }

  // Propagar metadata.
  @Get("just-for-test")
  async justForTest(@Req() req): Promise<any> {
    const client = await this.client();

    // Al llamar al servidor gRPC se transforma a JustForTest y asi sabe a que metodo ir.
    const result = await lastValueFrom(client.justForTest({ message: 'Just testing...' }, req._grpcMetadata));
    return result;
  }

}
