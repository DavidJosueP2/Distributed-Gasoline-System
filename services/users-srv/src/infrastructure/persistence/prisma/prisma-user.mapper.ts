import { Role } from '../../../domain/entities/role.entity';
import { User } from '../../../domain/entities/user.entity';
import { ensureUserStatus } from '../../../domain/value-objects/user-status.vo';

type PrismaRoleRecord = {
  id: bigint;
  name: string;
};

type PrismaUserRoleRecord = {
  id: bigint;
  roleId: bigint;
  userId: bigint;
  role: PrismaRoleRecord;
};

type PrismaUserWithRoles = {
  id: bigint;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  username: string;
  passwordHash: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userRoles: PrismaUserRoleRecord[];
};

export class PrismaUserMapper {
  static toDomain(user: PrismaUserWithRoles): User {
    // Ensure role IDs are properly converted from bigint to number
    const roles = (user.userRoles ?? []).map(
      (userRole) => new Role({ 
        id: parseInt(String(userRole.role.id), 10), 
        name: userRole.role.name 
      }),
    );
    // Ensure user ID is properly converted from bigint to number
    return User.create({
      id: parseInt(String(user.id), 10),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      username: user.username,
      passwordHash: user.passwordHash,
      status: ensureUserStatus(user.status),
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
