import { Body, Controller, Post, Logger, Req, UseGuards, Get } from '@nestjs/common';
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
import { JwtAuthGuard } from 'src/guards/JwtAuthGuard';
import { Public } from 'src/decorators/public.decorator';

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

  /**
  * Endpoint de prueba protegido con JWT.
  * - Verifica que el guard valide el token.
  * - Verifica que el interceptor propague los metadatos.
  */
  @Get('test')
  async test(@Req() req: any): Promise<any> {
    this.logger.debug('Payload del token:', req.user);
    this.logger.debug('Metadatos gRPC construidos:', req._grpcMetadata);

    return {
      message: 'Método de prueba ejecutado',
      user: req.user
    };
  }


}
