import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as https from 'https';

async function bootstrap() {
    const httpPort = Number(process.env.GATEWAY_HTTP_PORT ?? process.env.PORT ?? 8080);
    const sslEnabled = process.env.SSL_ENABLED === 'true';
    const sslPort = Number(process.env.SSL_PORT ?? 443);

    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: [
            'http://localhost:5174',
            'http://127.0.0.1:5174',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Origin',
            'X-Requested-With',
        ],
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));

    await app.listen(httpPort, '0.0.0.0');
    console.log(`[API Gateway] HTTP server listening on port ${httpPort}`);

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

            httpsApp.enableCors({
                origin: [
                    'http://localhost:5174',
                    'http://127.0.0.1:5174',
                ],
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                allowedHeaders: [
                    'Content-Type',
                    'Authorization',
                    'Accept',
                    'Origin',
                    'X-Requested-With',
                ],
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