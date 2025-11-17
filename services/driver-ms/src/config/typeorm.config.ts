import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // Asegurar que synchronize esté SIEMPRE en false
  const synchronize = configService.get<boolean>('DRIVER_DB_SYNCHRONIZE', false);
  
  // Solo ejecutar migrations si está explícitamente habilitado (útil para desarrollo)
  const migrationsRun = configService.get<boolean>('DRIVER_DB_RUN_MIGRATIONS', false);

  return {
    type: 'postgres',
    host: configService.get<string>('DRIVER_DB_HOST', 'localhost'),
    port: configService.get<number>('DRIVER_DB_PORT') || configService.get<number>('POSTGRES_PORT', 5438),
    username: configService.get<string>('DRIVER_DB_USER', 'postgres'),
    password: configService.get<string>('DRIVER_DB_PASS', 'admin'),
    database: configService.get<string>('DRIVER_DB_NAME', 'drivers'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false, // SIEMPRE false - usar init.sql y migrations manuales
    // Logging SQL deshabilitado para evitar logs gigantes de queries
    logging: false, // configService.get<boolean>('DRIVER_DB_LOGGING', false),
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: migrationsRun, // Ahora respeta la variable de entorno DRIVER_DB_RUN_MIGRATIONS
    extra: {
      charset: 'utf8mb4_unicode_ci',
    },
  };
};
