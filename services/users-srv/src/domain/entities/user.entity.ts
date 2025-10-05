import { UserStatus } from '../value-objects/user-status.vo';
import { Role } from './role.entity';

export interface UserProps {
  id: bigint | number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  passwordHash: string;
  status: UserStatus;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User({
      ...props,
      roles: props.roles,
    });
  }

  get id(): number {
    return Number(this.props.id);
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string {
    return this.props.phone;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get roles(): Role[] {
    return this.props.roles;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  withRoles(roles: Role[]): User {
    return User.create({ ...this.props, roles });
  }

}
