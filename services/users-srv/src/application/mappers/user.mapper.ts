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
      phone: user.phone,
      username: user.username,
      roles: user.roles.map((role) => ({ id: role.id, name: role.name })),
    };
  }

  static toFindByEmailResponse(user:User): FindUserByEmailResponse {
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

  
    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      username: user.username,
      password: user.password,
      roles: (user.roles || []).map((role) => ({
        roleId: role.id,
        name: role.name ,
      })),
    };
  }


  static toGrpc(user: UserResponseDto) {

    return {
      userId: user.id, 
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      username: user.username,
      roles: (user.roles || []).map((role) => ({
        roleId: role.id,
        name: role.name,
      })),
    };
  }

static toGrpcList(users: UserResponseDto[]) {
  
  return {
    items: users.map((user) => this.toGrpc(user)),
  };
}

  
}
