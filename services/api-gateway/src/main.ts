import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
    const httpPort = Number(process.env.GATEWAY_HTTP_PORT ?? process.env.PORT ?? 8080);
    const sslEnabled = process.env.SSL_ENABLED === 'true';
    const sslPort = Number(process.env.SSL_PORT ?? 8443);

    const app = await NestFactory.create(AppModule);

    // ========== CORS Configuration ==========
    // Permite múltiples orígenes según el ambiente
    const allowedOrigins = [
        // Local development
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        // Azure Container Apps - Frontend
        'https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io',
    ];

    // Si hay una variable de entorno adicional, agregarla
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Configuración CORS para HTTP
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Origin',
            'X-Requested-With',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Credentials',
        ],
        exposedHeaders: ['Authorization'],
        maxAge: 3600, // Cache preflight requests for 1 hour
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));

    await app.listen(httpPort, '0.0.0.0');
    console.log(`[API Gateway] HTTP server listening on port ${httpPort}`);
    console.log(`[API Gateway] CORS enabled for origins:`, allowedOrigins);

    if (sslEnabled) {
        try {
            const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/tls.crt';
            const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/certs/tls.key';

            console.log(`[API Gateway] SSL enabled - Loading certificates from ${certPath}`);

            if (!fs.existsSync(certPath)) {
                throw new Error(`Certificate file not found: ${certPath}`);
            }
            if (!fs.existsSync(keyPath)) {
                throw new Error(`Private key file not found: ${keyPath}`);
            }

            const httpsOptions = {
                cert: fs.readFileSync(certPath, 'utf8'),
                key: fs.readFileSync(keyPath, 'utf8'),
            };

            const httpsApp = await NestFactory.create(AppModule);

            // Configuración CORS para HTTPS (mismos orígenes)
            httpsApp.enableCors({
                origin: allowedOrigins,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
                allowedHeaders: [
                    'Content-Type',
                    'Authorization',
                    'Accept',
                    'Origin',
                    'X-Requested-With',
                    'Access-Control-Allow-Origin',
                    'Access-Control-Allow-Credentials',
                ],
                exposedHeaders: ['Authorization'],
                maxAge: 3600,
            });

            httpsApp.useGlobalPipes(new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true
            }));

            const httpsServer = https.createServer(httpsOptions, httpsApp.getHttpAdapter().getInstance());
            await httpsApp.init();

            httpsServer.listen(sslPort, '0.0.0.0', () => {
                console.log(`[API Gateway] HTTPS server listening on port ${sslPort}`);
                console.log(`[API Gateway] HTTPS CORS enabled for origins:`, allowedOrigins);
            });

        } catch (error) {
            console.error(`[API Gateway] Failed to start HTTPS server: ${error.message}`);
            console.error('[API Gateway] Continuing with HTTP only');
        }
    } else {
        console.log('[API Gateway] SSL disabled - Running HTTP only');
    }
}

bootstrap();