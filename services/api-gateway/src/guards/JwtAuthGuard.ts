import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  canActivate(context: ExecutionContext,): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();

    // Excepciones de rutas (como /log-in)
    if (req.path === '/auth/log-in') return true;

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = this.jwtService.verify(token);
      // puedes adjuntar el payload al request
      req.user = payload;

      // también opcionalmente enviar como metadatos gRPC
      req.grpcMetadata = { Authorization: `Bearer ${token}` };

      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
