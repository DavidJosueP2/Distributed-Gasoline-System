export interface ServiceTarget {
  appName: string;
  serviceName?: string;
  port?: number;
}

export class ServiceEndpoint {
  constructor(
    public readonly host: string,
    public readonly port: number,
    public readonly metadata: Record<string, unknown> = {},
  ) {}

  toString(): string {
    return `${this.host}:${this.port}`;
  }
}

export interface ServiceLocator {
  pick(target: ServiceTarget): Promise<ServiceEndpoint>;
}
