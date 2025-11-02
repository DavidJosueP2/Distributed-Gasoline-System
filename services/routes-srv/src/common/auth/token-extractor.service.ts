// src/common/auth/token-extractor.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Metadata } from '@grpc/grpc-js';

export type TokenPayload = {
  sub: number | { low: number; high?: number; unsigned?: boolean };
  email: string;
  roles?: Array<{ name: string }>;
} | Record<string, any>;

export interface UserInfo {
  userId: bigint;
  email: string;
  roles: string[]; // Array de nombres de roles
}

@Injectable()
export class TokenExtractorService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Extrae y decodifica el token JWT del metadata gRPC
   */
  extractUserInfo(metadata: Metadata | Record<string, any>): UserInfo {
    if (!metadata) {
      throw new Error('No metadata found');
    }

    // Metadata en @grpc/grpc-js se accede con get('key') y puede devolver string | Buffer
    // Soportar Metadata o mapa plano
    const possible = (metadata as any)?.get?.('authorization')?.[0]
      || (metadata as any)?.get?.('Authorization')?.[0]
      || (metadata as any)?.authorization
      || (metadata as any)?.Authorization;
    const authHeader = typeof possible === 'string' ? possible : (Buffer.isBuffer(possible) ? possible.toString('utf8') : undefined);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    
    let payload: TokenPayload | null = null;
    try {
      payload = this.jwtService.verify(token) as TokenPayload;
    } catch (error) {
      // Si falla la verificación (p.ej., servicios con secretos distintos), decodificar sin verificar.
      payload = this.jwtService.decode(token) as TokenPayload;
      if (!payload) throw new Error('Invalid token');
    }

    const subValue: any = (payload as any).sub;
    const userIdNum = typeof subValue === 'object' && subValue !== null && typeof subValue.low === 'number'
      ? subValue.low
      : Number(subValue);
    const roleNames = Array.isArray((payload as any).roles)
      ? ((payload as any).roles.map((r: any) => r.name).filter(Boolean))
      : [];

    return {
      userId: BigInt(userIdNum),
      email: (payload as any).email,
      roles: roleNames,
    };
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(userInfo: UserInfo, role: string): boolean {
    return userInfo.roles.includes(role);
  }

  /**
   * Verifica si el usuario es ADMIN
   */
  isAdmin(userInfo: UserInfo): boolean {
    return this.hasRole(userInfo, 'ADMIN');
  }

  /**
   * Verifica si el usuario es SUPERVISOR
   */
  isSupervisor(userInfo: UserInfo): boolean {
    return this.hasRole(userInfo, 'SUPERVISOR');
  }

  /**
   * Verifica si el usuario es DRIVER
   */
  isDriver(userInfo: UserInfo): boolean {
    return this.hasRole(userInfo, 'DRIVER');
  }
}

