// src/infra/discovery/eureka-register.ts
import { Eureka } from 'eureka-js-client';

function basePath() {
    const raw = process.env.EUREKA_BASE_PATH || '/eureka';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/**
 * Registra el microservicio de rutas en Eureka.
 * Variables soportadas (prioridad):
 *  - Nombre: ROUTES_APP_NAME -> APP_NAME -> 'ROUTES-SERVICE'
 *  - Puerto gRPC: ROUTES_GRPC_PORT -> GRPC_PORT -> 50053
 *  - Host publicado: SERVICE_REGISTER_HOST -> REGISTER_HOST -> '127.0.0.1'
 */
export function registerInEureka() {
    const app = process.env.ROUTES_APP_NAME || process.env.APP_NAME || 'ROUTES-SERVICE';

    const host = process.env.SERVICE_REGISTER_HOST || process.env.REGISTER_HOST || '127.0.0.1';

    const port = Number(
        process.env.ROUTES_GRPC_PORT ||
        process.env.GRPC_PORT ||
        50053
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

    
    const stop = () => {
        try { client.stop(); } catch {}
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    return client;
}
