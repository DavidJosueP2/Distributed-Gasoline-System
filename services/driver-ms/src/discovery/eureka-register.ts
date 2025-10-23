import { Eureka } from 'eureka-js-client';
import { Logger } from '@nestjs/common';
import { getEurekaConfig, normalizeBasePath } from '../utils/eureka-helper';

// Elimina la función local basePath() y usa la importada
export function registerInEureka() {
  const logger = new Logger('Eureka');

  const {
    host: eurekaHost,
    port: eurekaPort,
    waitTimeoutMs,
    serviceUrl
  } = getEurekaConfig();

  const DRIVER_HTTP_PORT = Number(process.env.DRIVER_HTTP_PORT || 3001);
  const DRIVER_GRPC_PORT = Number(process.env.DRIVER_GRPC_PORT || 50052);
  const APP_NAME = process.env.DRIVER_APP_NAME || 'driver-service';
  const HOST = process.env.SERVICE_BIND_HOST || '127.0.0.1';

  logger.log(`Connecting to Eureka at: ${serviceUrl}`);

  const client = new Eureka({
    instance: {
      app: APP_NAME,
      instanceId: `${APP_NAME}:${HOST}:${DRIVER_GRPC_PORT}`,
      hostName: HOST,
      ipAddr: HOST,
      port: { $: DRIVER_GRPC_PORT, '@enabled': true },
      vipAddress: APP_NAME,
      statusPageUrl: `http://${HOST}:${DRIVER_HTTP_PORT}/info`,
      healthCheckUrl: `http://${HOST}:${DRIVER_HTTP_PORT}/health`,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
      metadata: {
        'gRPC.port': DRIVER_GRPC_PORT.toString(),
        protocols: 'http,grpc',
      },
    },
    eureka: {
      host: eurekaHost,
      port: eurekaPort,
      servicePath: `${normalizeBasePath(process.env.EUREKA_BASE_PATH)}/apps/`,
      maxRetries: 3,
      requestRetryDelay: 2000,
      requestTimeout: waitTimeoutMs,
    },
  });

  client.start((err) => {
    if (err) logger.error(`Eureka registration failed for ${serviceUrl}:`, err);
    else logger.log(`Successfully registered ${APP_NAME} at ${HOST}:${DRIVER_HTTP_PORT}`);
  });

  const stop = () => {
    try {
      client.stop();
    } catch {}
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  return client;
}