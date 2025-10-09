import { Body, Controller, Post, Logger, Req, Get, UseGuards, HttpCode } from '@nestjs/common';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';
import {
  AuthServiceClient,
} from 'src/grpc/auth/auth.client';
import type {
  LoginRequest,
  LoginResponse,
  PasswordRecoveryRequest,
  PasswordRecoveryResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UpdateFullnameRequest,
  UserResponse,
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
  @HttpCode(200)
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

  // Request de recuperacion de contraseña
  @Public()
  @Post("recover-password")
  @HttpCode(200)
  public async recoverPassword(@Body() dto: PasswordRecoveryRequest): Promise<PasswordRecoveryResponse> {
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

  @Public()
  @Post("reset-password")
  public async resetPassword(@Body() dto: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const client = await this.client();
    const result = await lastValueFrom(
      client.resetPassword(dto).pipe(
        catchError((error) => {
          this.logger.error('Error en comunicación gRPC:', error);
          throw error;
        }),
      ),
    );

    return result;
  }

  @Get("me") // Obtener datos del usuario autenticado (si o si token)
  public async me(@Req() req): Promise<UserResponse> {
    const client = await this.client();
    const result = await lastValueFrom(client.me({}, req._grpcMetadata));
    const userId = result.userId;
    const validUserId = Number(userId);
    result.userId = validUserId;
    return result;
  }

  @Post("update-fullname")
  public async updateFullname(@Body() dto: UpdateFullnameRequest, @Req() req): Promise<UserResponse> {
    const client = await this.client();
    const result = await lastValueFrom(client.updateFullname(dto, req._grpcMetadata));
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
