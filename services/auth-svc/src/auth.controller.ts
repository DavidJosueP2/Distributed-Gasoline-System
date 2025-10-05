import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

// Esto le dice a typescript: este import solo es de tipo, no lo intentes meter en los metadatos de los decoradores
import type { LoginRequest, LoginResponse } from './types/auth.types';
import { Observable } from 'rxjs';
import { Roles } from './common/auth/decorators/roles.decorator';
import { Public } from './common/auth/decorators/public.decorator';
import { Metadata } from '@grpc/grpc-js';

@Controller()
export class AuthController {

  constructor(private readonly auth: AuthService) { }

  @Public()
  @GrpcMethod('AuthService', 'Login') // Esto debe con el nombre del servicio en el archivo .proto y el nombre de metodo gRPC.
  public login(data: LoginRequest): Observable<LoginResponse> {
    const response$ = this.auth.login(data.email, data.password);
    return response$;
  }

  @Roles('ADMIN')
  @GrpcMethod('AuthService', 'JustForTest')
  public justForTest(data: { message: string }, metadata: Metadata): Promise<any> {
    return this.auth.justForTest(data, metadata);
  }
}
