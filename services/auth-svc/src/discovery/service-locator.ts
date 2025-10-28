export interface ServiceTarget {
  /** Application identifier used in Eureka (usually upper-case). */
  appName: string;
  /**
   * Optional DNS-friendly service name. When omitted the locator derives it
   * from `appName`.
   */
  serviceName?: string;
  /** Optional preferred port when discovery strategy cannot infer it. */
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
