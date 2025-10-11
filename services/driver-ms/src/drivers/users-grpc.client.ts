import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom, timeout, catchError, throwError } from 'rxjs';
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

@Injectable()
export class UsersGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(UsersGrpcClient.name);
  private userService: IUserService;
  private readonly timeoutMs = Number(process.env.GRPC_TIMEOUT_MS || 3000);

  constructor(private readonly grpcClientFactory: GrpcClientFactory) {}

  async onModuleInit() {
    try {
      const appName = process.env.USERS_APP_NAME || process.env.APP_NAME || 'USERS-SERVICE';
      const client: ClientGrpc = await this.grpcClientFactory.clientFor(
        appName,
        'users',
        'users.proto',
      );
      this.userService = client.getService<IUserService>('UserService');
      this.logger.log('UsersService gRPC client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize UsersService gRPC client', error);
      throw error;
    }
  }

  async getUser(userId: any, metadata?: any): Promise<UserResponse> {
    this.logger.log(`Validating user via gRPC: ${JSON.stringify(userId)}`);

    try {
      // Coerce long-like objects to primitive number and send camelCase field
      let outgoingId: string | number | bigint = userId;
      if (typeof userId === 'object' && userId !== null && Object.prototype.hasOwnProperty.call(userId, 'low')) {
        // protobuf Long-like from grpc can have { low, high }
        outgoingId = Number((userId as any).low);
      } else if (typeof userId !== 'string' && typeof userId !== 'number' && typeof userId !== 'bigint') {
        // fallback: try to coerce to number
        outgoingId = Number(userId);
      }

      // If metadata is provided, pass it as second argument to the gRPC method
      const call$: Observable<UserResponse> = metadata 
        ? this.userService.getUser({ userId: outgoingId }, metadata)
        : this.userService.getUser({ userId: outgoingId });

      const response = (await firstValueFrom(
        call$.pipe(
          timeout(this.timeoutMs),
          catchError((error) => {
            this.logger.error('Error getting user via gRPC', error);
            return throwError(() => error);
          }),
        ),
      )) as UserResponse;      return response;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}`, error);
      throw error;
    }
  }
}
