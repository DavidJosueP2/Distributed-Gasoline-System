import { User } from '../../domain/entities/user.entity';
import FindUserByEmailResponse from '../dto/response/find-user-by-email-response';
import { UserResponseDto } from '../dto/response/user-response';


export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? null,
      username: user.username,
      status: user.status,
      roles: user.roles.map((role) => ({ id: role.id, name: role.name })),
    };
  }

  static toLoginResponse(user:User): FindUserByEmailResponse {
  return {
    id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      username: user.username,
      password: user.passwordHash,
      roles: user.roles.map((role) => ({ id: role.id, name: role.name })),
  };
    
  }

  

  static toList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }

  static toGrpcByEmail(user:FindUserByEmailResponse) {

      const userId = user.id || 0; 
    return {
      userId: userId, 
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || undefined,
      username: user.username || '',
      password: user.password || '',
      roles: (user.roles || []).map((role) => ({
        roleId: role.id || 0,
        name: role.name || '',
      })),
    };
  }

  static toGrpc(user: UserResponseDto) {

    const userId = user.id || 0;
    
    return {
      userId: userId, // Leave as a number for gRPC
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || undefined,
      username: user.username || '',
      status: user.status || '',
      roles: (user.roles || []).map((role) => ({
        roleId: role.id || 0, // Leave as a number for gRPC
        name: role.name || '',
      })),
    };
  }

static toGrpcList(users: UserResponseDto[]) {
  // Asegurarse de mapear solo DTOs planos, no objetos ya gRPC
  return {
    items: users.map((user) => this.toGrpc(user)),
  };
}

  
}
