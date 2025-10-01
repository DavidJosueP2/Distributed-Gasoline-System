export interface RoleProps {
  id: bigint | number;
  name: string;
}

export class Role {
  constructor(private readonly props: RoleProps) {}

  get id(): number {
    return Number(this.props.id);
  }

  get name(): string {
    return this.props.name;
  }

  toJSON(): RoleProps {
    return {
      id: BigInt(this.props.id),
      name: this.props.name,
    };
  }
}
