export interface ServiceTarget {
    /** Application identifier used in Eureka (usually upper-case). */
    appName: string;
    /**
     * Optional DNS-friendly name. When omitted the locator will derive it from `appName`.
     * Useful to point to azure/k8s service names that do not match the Eureka app id.
     */
    serviceName?: string;
    /**
     * Optional preferred port. DNS strategies can fall back to this when they cannot infer
     * the port from environment variables.
     */
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
