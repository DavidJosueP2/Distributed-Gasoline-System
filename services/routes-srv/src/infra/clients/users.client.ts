import { Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SupervisorsResponse {
  items: UserResponse[];
}

export interface UsersServiceClient {
  GetUser(data: { userId: number }): Observable<UserResponse>;
  GetAllSupervisors(data: {}): Observable<SupervisorsResponse>;
}

@Injectable()
export class UsersClient {
  private usersService: UsersServiceClient;

  constructor(private readonly client: ClientGrpc) {
    this.usersService = this.client.getService<UsersServiceClient>('UserService');
  }

  async getUserInfo(userId: bigint): Promise<UserInfo> {
    const response = await lastValueFrom(
      this.usersService.GetUser({ userId: Number(userId) })
    );
    
    return {
      id: response.userId,
      firstName: response.firstName,
      lastName: response.lastName,
      email: response.email,
    };
  }

  async getAllSupervisors(): Promise<UserInfo[]> {
    const response = await lastValueFrom(
      this.usersService.GetAllSupervisors({})
    );
    
    return (response.items || []).map((user: UserResponse) => ({
      id: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }));
  }
}
