import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEngineService } from './workflow-engine.service';
import { AuditTrailService } from './audit-trail.service';
import { ClaimEntity } from './entities/claim.entity';
import { AuditLogEntity } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClaimEntity, AuditLogEntity])],
  providers: [WorkflowEngineService, AuditTrailService],
  exports: [TypeOrmModule, WorkflowEngineService, AuditTrailService],
})
export class EngineModule {}
