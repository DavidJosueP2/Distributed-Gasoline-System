import { Eureka } from 'eureka-js-client';

function basePath() {
  const raw = process.env.EUREKA_BASE_PATH || '/eureka';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

// Registra el microservicio actual en Eureka
export function registerInEureka() {
  const app =
    process.env.EMAIL_APP_NAME;

  console.log("EUREKA REGISTER", { app })

  const host =
    process.env.EMAIL_SERVICE_REGISTER_HOST;

  const port = Number(
    process.env.EMAIL_GRPC_PORT || 50052,
  );

  const client = new Eureka({
    instance: {
      app,
      instanceId: `${app}:${host}:${port}`,
      hostName: host,
      ipAddr: host,
      port: { $: port, '@enabled': true },
      vipAddress: app,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
    },
    eureka: {
      host: process.env.EUREKA_HOST || 'localhost',
      port: Number(process.env.EUREKA_PORT || 8761),
      servicePath: `${basePath()}/apps/`,
    },
  });

  client.start((err) => {
    if (err) console.error('[eureka] register error:', err.message);
    else console.log(`[eureka] registered ${app} at ${host}:${port}`);
  });

  // Detener limpio al apagar el proceso
  const stop = () => {
    try {
      client.stop();
    } catch { }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  return client;
}
