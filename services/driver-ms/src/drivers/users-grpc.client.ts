import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import {
  Observable,
  firstValueFrom,
  timeout,
  catchError,
  throwError,
} from 'rxjs';
import { GrpcClientFactory } from '../grpc/grpc-client.factory';

// Interfaces basadas en users.proto
export interface UserIdRequest {
  // users-srv expects camelCase `userId` (string|number|bigint)
  userId: string | number | bigint;
}

export interface RoleResponse {
  role_id: number;
  name: string;
}

export interface UserResponse {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  username: string;
  roles: RoleResponse[];
}

export interface IUserService {
  getUser(request: UserIdRequest, metadata?: any): Observable<UserResponse>;
}

// Alias de tipos para IDs primitivos
type PrimitiveId = string | number | bigint;

@Injectable()
export class UsersGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(UsersGrpcClient.name);
  private userService: IUserService | undefined;
  private readonly timeoutMs = Number(process.env.GRPC_TIMEOUT_MS || 3000);

  constructor(private readonly grpcClientFactory: GrpcClientFactory) {}

  private stringifyId(
    id: PrimitiveId | { low: number; high?: number },
  ): string {
    return typeof id === 'object' ? JSON.stringify(id) : String(id);
  }

  async onModuleInit() {
    // Diferir discovery hasta el primer uso, salvo que se fuerce vía env
    const defer =
      (process.env.DEFER_USERS_CLIENT_INIT ?? 'true').toLowerCase() !== 'false';
    if (defer) {
      this.logger.warn(
        'UsersService gRPC client init deferred until first call (set DEFER_USERS_CLIENT_INIT=false to init on bootstrap)',
      );
      return;
    }
    try {
      await this.ensureClient(false);
    } catch {
      this.logger.warn(
        'UsersService gRPC client not ready at bootstrap, will retry on first call',
      );
    }
  }

  // Asegura el cliente gRPC; con reintentos opcionales
  private async ensureClient(withRetry: boolean = true): Promise<void> {
    if (this.userService) return;

    const appName = process.env.USERS_APP_NAME || 'USERS-SERVICE';
    const maxWaitMs = Number(process.env.USERS_DISCOVERY_WAIT_MS || 15000);
    const intervalMs = 1000;
    const start = Date.now();
    let lastError: unknown;

    do {
      try {
        const client: ClientGrpc = await this.grpcClientFactory.clientFor(
          appName,
          'users',
          'users.proto',
        );
        const svc = client.getService<IUserService>('UserService');
        if (svc) {
          this.userService = svc;
          this.logger.log(
            `UsersService gRPC client initialized (app=${appName})`,
          );
          return;
        }
      } catch (err) {
        lastError = err;
        if (!withRetry) break;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    } while (withRetry && Date.now() - start < maxWaitMs);

    if (!this.userService) {
      if (lastError instanceof Error) {
        throw lastError;
      }
      throw new Error('UsersService client not available');
    }
  }

  async getUser(
    userId: PrimitiveId | { low: number; high?: number },
    metadata?: unknown,
  ): Promise<UserResponse> {
    this.logger.log(`Validating user via gRPC: ${this.stringifyId(userId)}`);

    try {
      // Asegurar cliente con reintentos en la primera invocación real
      await this.ensureClient(true);

      // Coerce long-like objects to primitive number and send camelCase field
      let outgoingId: PrimitiveId = userId as PrimitiveId;
      if (typeof userId === 'object' && userId !== null && 'low' in userId) {
        // protobuf Long-like from grpc can have { low, high }
        outgoingId = Number(userId.low);
      } else if (
        typeof userId !== 'string' &&
        typeof userId !== 'number' &&
        typeof userId !== 'bigint'
      ) {
        // fallback: try to coerce to number
        outgoingId = Number(userId);
      }

      // If metadata is provided, pass it as second argument to the gRPC method
      const call$ = metadata
        ? this.userService!.getUser({ userId: outgoingId }, metadata)
        : this.userService!.getUser({ userId: outgoingId });

      const response = await firstValueFrom<UserResponse>(
        call$.pipe(
          timeout(this.timeoutMs),
          catchError((error: unknown) => {
            this.logger.error('Error getting user via gRPC', error);
            return throwError(() =>
              error instanceof Error ? error : new Error(String(error)),
            );
          }),
        ),
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get user ${this.stringifyId(userId)}`,
        error,
      );
      throw error;
    }
  }
}
