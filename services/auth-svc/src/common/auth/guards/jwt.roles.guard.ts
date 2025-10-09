import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Metadata } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const ctx = context.switchToRpc().getContext();
    const metadata: Metadata = ctx.getMap();
    if (!metadata) throw new RpcException('No metadata found');

    const authHeader = metadata['authorization'];
    if (!authHeader) throw new RpcException('No token provided');

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = this.jwtService.verify(token);

      const roleNames = payload.roles?.map((r) => r.name) ?? [];

      if (requiredRoles && !requiredRoles.some((r) => roleNames.includes(r))) {
        throw new RpcException('Insufficient role');
      }

      return true;
    } catch (e) {
      throw new RpcException('Invalid token');
    }
  }
}
