import { Logger } from '@nestjs/common';

const logger = new Logger('EurekaHelper');

// Función centralizada para normalizar basePath
export function normalizeBasePath(basePath?: string): string {
  let path = basePath || '/eureka';
  
  // Asegurar que empiece con /
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  
  // Remover slash final si existe
  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1);
  }
  
  return path;
}

export function getEurekaServiceUrl(): string {
  const host = process.env.EUREKA_HOST || 'localhost';
  const port = process.env.EUREKA_PORT || '8761';
  const basePath = normalizeBasePath(process.env.EUREKA_BASE_PATH);
  
  return `http://${host}:${port}${basePath}`;
}

export function getEurekaConfig() {
  const host = process.env.EUREKA_HOST || 'localhost';
  const port = Number(process.env.EUREKA_PORT || 8761);
  const basePath = normalizeBasePath(process.env.EUREKA_BASE_PATH);
  const waitTimeoutMs = Number(process.env.EUREKA_WAIT_TIMEOUT_MS || 15000);
  const serviceUrl = getEurekaServiceUrl();

  // Log solo en desarrollo para no saturar logs en producción
  if (process.env.NODE_ENV === 'development') {
    logger.log(`Eureka Configuration: ${serviceUrl}`);
  }

  return {
    host,
    port,
    basePath,
    waitTimeoutMs,
    serviceUrl,
  };
}

// ✅ Función adicional para validar configuración
export function validateEurekaConfig(): boolean {
  const config = getEurekaConfig();
  
  if (!config.host || !config.port) {
    logger.warn('Eureka host or port not configured properly');
    return false;
  }
  
  if (isNaN(config.port)) {
    logger.warn('Eureka port is not a valid number');
    return false;
  }
  
  return true;
}