import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('POSTGRES_HOST', 'localhost'),
  port: configService.get<number>('DRIVER_DB_PORT') || configService.get<number>('POSTGRES_PORT', 5432),
  username: configService.get<string>('POSTGRES_USER', 'postgres'),
  password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
  database: configService.get<string>('DRIVER_DB', 'driver_db'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get<boolean>('DRIVER_DB_SYNCHRONIZE', false),
  logging: configService.get<boolean>('DRIVER_DB_LOGGING', true),
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  extra: {
    charset: 'utf8mb4_unicode_ci',
  },
});
