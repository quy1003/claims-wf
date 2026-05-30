import { Module } from '@nestjs/common';
import { ScenariosController } from './scenarios.controller';
import { ScenariosService } from './scenarios.service';
import { ClaimsModule } from '../claims/claims.module';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [ClaimsModule, EngineModule],
  controllers: [ScenariosController],
  providers: [ScenariosService],
})
export class ScenariosModule {}
