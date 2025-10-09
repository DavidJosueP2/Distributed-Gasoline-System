import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
  ValidationError,
} from 'class-validator';

class EnvironmentVariables {
  @IsNumber({}, { message: 'DRIVER_HTTP_PORT must be a valid number' })
  DRIVER_HTTP_PORT: number;

  @IsNumber({}, { message: 'DRIVER_GRPC_PORT must be a valid number' })
  DRIVER_GRPC_PORT: number;



  @IsString({ message: 'BIND_HOST must be a string' })
  SERVICE_BIND_HOST: string;

   @IsString({ message: 'PROTO_ROOT must be a string' })
  PROTO_ROOT: string;

   @IsString({ message: 'PROTOS_DIR must be a string' })
  PROTOS_DIR: string;

  @IsString({ message: 'EUREKA_HOST must be a string' })
  EUREKA_HOST: string;

  @IsNumber({}, { message: 'EUREKA_PORT must be a valid number' })
  EUREKA_PORT: number;

  @IsString({ message: 'EUREKA_BASE_PATH must be a string' })
  EUREKA_BASE_PATH: string;

  @IsNumber({}, { message: 'EUREKA_WAIT_TIMEOUT_MS must be a valid number' })
  EUREKA_WAIT_TIMEOUT_MS: number;



  @IsString({ message: 'DRIVER_DB_HOST must be a string' })
  DRIVER_DB_HOST: string;

  @IsString({ message: 'DRIVER_DB_USER must be a string' })
  DRIVER_DB_USER: string;

  @IsString({ message: 'DRIVER_DB_PASS must be a string' })
  DRIVER_DB_PASS: string;

  @IsString({ message: 'DRIVER_DB_NAME must be a string' })
  DRIVER_DB_NAME: string;

  @IsOptional()
  @IsNumber({}, { message: 'DRIVER_DB_PORT must be a valid number' })
  DRIVER_DB_PORT?: number;

  @IsBoolean({ message: 'DRIVER_DB_SYNCHRONIZE must be a boolean' })
  DRIVER_DB_SYNCHRONIZE: boolean;

  @IsBoolean({ message: 'DRIVER_DB_LOGGING must be a boolean' })
  DRIVER_DB_LOGGING: boolean;

  @IsString({ message: 'DRIVER_NODE_ENV must be a string' })
  DRIVER_NODE_ENV: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors: ValidationError[] = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error: ValidationError) => {
        // Manejo seguro de constraints
        if (error.constraints) {
          return Object.values(error.constraints).join(', ');
        }
        return `Property ${error.property} has validation errors`;
      })
      .join('; ');

    throw new Error(`Config validation error: ${errorMessages}`);
  }

  return validatedConfig;
}
