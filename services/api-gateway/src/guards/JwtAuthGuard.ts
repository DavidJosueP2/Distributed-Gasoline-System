import {
  CanActivate,
  ExecutionContext,
  Injectable
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) { }

  canActivate(context: ExecutionContext,): boolean | Promise<boolean> | Observable<boolean> {

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      console.log("JwtAuthGuard: Ruta publica.")
      // Ruta marcada como pública, no validar token
      return true;
    }

    const req = context.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new RpcException('No token provided');
    }
    console.log('Gateway JWT secret:', process.env.JWT_SECRET);
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = this.jwtService.verify(token);
      console.log("Payload del token verificado:", payload);

      // Este es un payload para el http. No util por el momento.
      req.user = payload;

      return true;
    } catch (e) {
      console.error('Token verification failed:', e);
      throw new RpcException('Invalid token');
    }
  }
}
