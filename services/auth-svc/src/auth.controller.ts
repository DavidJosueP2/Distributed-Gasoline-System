import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

// Esto le dice a typescript: este import solo es de tipo, no lo intentes meter en los metadatos de los decoradores
import { LoginRequest, PasswordRecoveryRequest, ResetPasswordRequest, UpdateFullnameRequest } from './types/auth.types';
import type { LoginResponse, PasswordRecoveryResponse, ResetPasswordResponse, UserResponse } from "./types/auth.types";
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

  @Public()
  @GrpcMethod('AuthService', 'RecoverPassword')
  public recoverPassword(data: PasswordRecoveryRequest): Promise<PasswordRecoveryResponse> {
    return this.auth.recoverPassword(data.email);
  }

  @Public()
  @GrpcMethod('AuthService', 'ResetPassword')
  public resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.auth.resetPassword(data.token, data.newPassword);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'DRIVER') // Cualquier usuario autenticado (si o si token)
  @GrpcMethod('AuthService', 'Me')
  public me(data: {}, metadata: Metadata): Promise<UserResponse> {
    return this.auth.me(data, metadata);
  }

  @Roles('ADMIN', 'SUPERVISOR', 'DRIVER')
  @GrpcMethod('AuthService', 'UpdateFullname')
  public updateFullname(data: UpdateFullnameRequest, metadata: Metadata): Promise<UserResponse> {
    return this.auth.updateFullname(data, metadata);
  }

  @Roles('ADMIN')
  @GrpcMethod('AuthService', 'JustForTest')
  public justForTest(data: { message: string }, metadata: Metadata): Promise<any> {
    return this.auth.justForTest(data, metadata);
  }


}
