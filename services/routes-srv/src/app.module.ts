import { Module } from '@nestjs/common';
import { RoutesGrpcModule } from './presentation/modules/routes-grpc.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('ROUTES_DB_HOST', 'localhost'),
                port: configService.get('ROUTES_DB_PORT', 5500),
                username: configService.get('ROUTES_DB_USER', 'postgres'),
                password: configService.get('ROUTES_DB_PASS', 'admin'),
                database: configService.get('ROUTES_DB_NAME', 'routes'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get('NODE_ENV') === 'development',
                logging: configService.get('NODE_ENV') === 'development',
            }),
            inject: [ConfigService],
        }),
        RoutesGrpcModule,
    ],
})
export class AppModule {}