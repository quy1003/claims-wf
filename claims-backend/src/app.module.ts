import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EngineModule } from './engine/engine.module';
import { ClaimsModule } from './claims/claims.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { ClaimEntity } from './engine/entities/claim.entity';
import { AuditLogEntity } from './engine/entities/audit-log.entity';

@Module({
  imports: [
    // Global Config Module to load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Asynchronous TypeORM Configuration for MySQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'claims_db'),
        entities: [ClaimEntity, AuditLogEntity],
        synchronize: true, // Automatically synchronize database schemas for rapid setup
      }),
    }),
    
    EngineModule,
    ClaimsModule,
    ScenariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

