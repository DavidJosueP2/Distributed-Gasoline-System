import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ServiceEndpoint,
  ServiceLocator,
  ServiceTarget,
} from './service-locator';

@Injectable()
export class K8sDnsLocator implements ServiceLocator {
  private readonly namespace: string;
  private readonly clusterDomain: string;
  private readonly defaultPort: number;
  private readonly prefix: string;
  private readonly suffix: string;

  constructor(private readonly config: ConfigService) {
    this.namespace =
      this.config.get<string>('K8S_NAMESPACE') ??
      process.env.K8S_NAMESPACE ??
      'fuelhub';
    this.clusterDomain =
      this.config.get<string>('K8S_CLUSTER_DOMAIN') ??
      process.env.K8S_CLUSTER_DOMAIN ??
      'svc.cluster.local';
    this.defaultPort = Number(
      this.config.get<string>('SVC_PORT') ?? process.env.SVC_PORT ?? 8080,
    );
    this.prefix =
      this.config.get<string>('DNS_SERVICE_PREFIX') ??
      process.env.DNS_SERVICE_PREFIX ??
      '';
    this.suffix =
      this.config.get<string>('DNS_SERVICE_SUFFIX') ??
      process.env.DNS_SERVICE_SUFFIX ??
      '';
  }

  private toEnvKey(appName: string): string {
    return appName
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private normalizeServiceName(appName: string): string {
    const normalized = appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (normalized.endsWith('-service')) {
      return normalized.replace(/-service$/, '-svc');
    }
    return normalized;
  }

  private resolveServiceLabel(target: ServiceTarget): string {
    if (target.serviceName && target.serviceName.trim().length > 0) {
      return target.serviceName.trim();
    }
    const envKey = this.toEnvKey(target.appName);
    const envOverrides = [
      process.env[`${envKey}_DNS_NAME`],
      process.env[`${envKey}_SERVICE_NAME`],
      process.env[`${envKey}_SERVICE_HOST`],
      process.env[`${envKey}_HOST`],
    ].find((value) => typeof value === 'string' && value.length > 0);

    const base = envOverrides || this.normalizeServiceName(target.appName);
    return `${this.prefix}${base}${this.suffix}`
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private resolvePort(target: ServiceTarget): number {
    if (typeof target.port === 'number' && target.port > 0) return target.port;
    const envKey = this.toEnvKey(target.appName);
    const envPort =
      process.env[`${envKey}_GRPC_PORT`] ||
      process.env[`${envKey}_PORT`] ||
      process.env[`${envKey}_SERVICE_PORT`];
    if (envPort) {
      const numeric = Number(envPort);
      if (!Number.isNaN(numeric) && numeric > 0) {
        return numeric;
      }
    }
    return this.defaultPort;
  }

  private buildHost(label: string): string {
    if (!label) return label;
    if (label.includes('.')) return label;
    const parts = [label];
    if (this.namespace) parts.push(this.namespace);
    if (this.clusterDomain) parts.push(this.clusterDomain);
    return parts.filter(Boolean).join('.');
  }

  async pick(target: ServiceTarget): Promise<ServiceEndpoint> {
    const label = this.resolveServiceLabel(target);
    const host = this.buildHost(label);
    const port = this.resolvePort(target);
    return new ServiceEndpoint(host, port, {
      source: 'dns',
      namespace: this.namespace,
    });
  }
}
