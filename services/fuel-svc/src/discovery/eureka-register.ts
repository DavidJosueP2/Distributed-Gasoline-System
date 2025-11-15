import { Eureka } from 'eureka-js-client';

function basePath() {
  const raw = process.env.EUREKA_BASE_PATH || '/eureka';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

// Registra el microservicio actual en Eureka
export function registerInEureka() {
  const app =
    process.env.FUEL_APP_NAME || 'FUEL-SERVICE';

  const host =
    process.env.FUEL_SERVICE_REGISTER_HOST ||
    process.env.SERVICE_REGISTER_HOST ||
    process.env.REGISTER_HOST ||
    '127.0.0.1';

  const port = Number(
    process.env.FUEL_GRPC_PORT || 50054,
  );

  // 🔍 LOGS DE DEBUGGING
  console.log('========================================');
  console.log('🔧 FUEL SERVICE - EUREKA REGISTRATION');
  console.log('========================================');
  console.log('📋 Variables de entorno disponibles:');
  console.log('  FUEL_SERVICE_REGISTER_HOST:', process.env.FUEL_SERVICE_REGISTER_HOST || '(no definida)');
  console.log('  SERVICE_REGISTER_HOST:', process.env.SERVICE_REGISTER_HOST || '(no definida)');
  console.log('  REGISTER_HOST:', process.env.REGISTER_HOST || '(no definida)');
  console.log('  FUEL_APP_NAME:', process.env.FUEL_APP_NAME || '(no definida)');
  console.log('  FUEL_GRPC_PORT:', process.env.FUEL_GRPC_PORT || '(no definida)');
  console.log('  EUREKA_HOST:', process.env.EUREKA_HOST || '(no definida)');
  console.log('  EUREKA_PORT:', process.env.EUREKA_PORT || '(no definida)');
  console.log('========================================');
  console.log('✅ Valores finales utilizados:');
  console.log('  App Name:', app);
  console.log('  Register Host:', host);
  console.log('  gRPC Port:', port);
  console.log('  Eureka Server:', `${process.env.EUREKA_HOST || 'localhost'}:${process.env.EUREKA_PORT || 8761}`);
  console.log('  Instance ID:', `${app}:${host}:${port}`);
  console.log('========================================');

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
    if (err) {
      console.error('❌ [eureka] register error:', err.message);
      console.error('   Full error:', err);
    } else {
      console.log(`✅ [eureka] Successfully registered ${app} at ${host}:${port}`);
    }
  });

  // Detener limpio al apagar el proceso
  const stop = () => {
    try {
      console.log('🛑 [eureka] Deregistering from Eureka...');
      client.stop();
    } catch (e) {
      console.error('⚠️ [eureka] Error during deregistration:', e);
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  return client;
}
