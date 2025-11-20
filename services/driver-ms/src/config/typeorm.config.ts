import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // Asegurar que synchronize esté SIEMPRE en false
  const synchronize = configService.get<boolean>('DRIVER_DB_SYNCHRONIZE', false);
  
  // Solo ejecutar migrations si está explícitamente habilitado
  const migrationsRun = configService.get<boolean>('DRIVER_DB_RUN_MIGRATIONS', false);

  // SSL Configuration para Azure PostgreSQL
  const sslEnabled = configService.get<string>('DB_SSL') === 'true' ||
                     configService.get<string>('DB_SSL_MODE') === 'require' ||
                     configService.get<string>('DRIVER_DB_SSL_MODE') === 'require';

  const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';

  return {
    type: 'postgres',
    host: configService.get<string>('DRIVER_DB_HOST') || configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DRIVER_DB_PORT') || configService.get<number>('DB_PORT') || configService.get<number>('POSTGRES_PORT', 5438),
    username: configService.get<string>('DRIVER_DB_USER') || configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DRIVER_DB_PASS') || configService.get<string>('DB_PASSWORD', 'admin'),
    database: configService.get<string>('DRIVER_DB_NAME') || configService.get<string>('DB_NAME', 'drivers'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false, // SIEMPRE false - usar init.sql y migrations manuales
    // Logging SQL deshabilitado para evitar logs gigantes de queries
    logging: false, // configService.get<boolean>('DRIVER_DB_LOGGING', false),
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false, // Deshabilitar auto-ejecución de migrations
    // SSL Configuration (OBLIGATORIO en Azure)
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false,
    extra: {
      charset: 'utf8mb4_unicode_ci',
    },
  };
};
