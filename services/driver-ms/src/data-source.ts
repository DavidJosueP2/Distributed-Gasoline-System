import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

// Cargar el archivo .env desde la raíz del proyecto
const rootEnvPath = join(__dirname, '..', '..', '..', '.env');
dotenv.config({ path: rootEnvPath });

// También intentar cargar un .env local si existe
dotenv.config({ path: join(__dirname, '..', '.env') });

// Usar las mismas variables de entorno que usa la aplicación
const host = process.env.POSTGRES_HOST || 'localhost';
const port = process.env.DRIVER_DB_PORT 
  ? parseInt(process.env.DRIVER_DB_PORT, 10) 
  : (process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432);
const username = process.env.POSTGRES_USER || 'postgres';
const password = process.env.POSTGRES_PASSWORD || 'root';
const database = process.env.DRIVER_DB || 'driver';

console.log('🔧 DataSource Configuration:');
console.log(`   Host: ${host}`);
console.log(`   Port: ${port}`);
console.log(`   Username: ${username}`);
console.log(`   Database: ${database}`);
console.log(`   Password: ${password ? '***' : '(empty)'}`);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // We run migrations explicitly with the CLI, so keep synchronize false
  synchronize: false,
  // Logging SQL deshabilitado para evitar logs gigantes de queries
  logging: false, // Solo activar cuando necesites debuggear migraciones
});

// Note: do not export default to keep a single named export for the CLI
