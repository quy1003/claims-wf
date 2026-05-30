import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { TriggeredBy, AuditLog } from './types';
import * as crypto from 'crypto';

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Log a state transition. The entry is persistent and frozen in memory to protect immutability.
   */
  async create(
    claimId: string,
    fromState: string | null,
    toState: string,
    triggeredBy: TriggeredBy,
    reason: string,
    context: Record<string, any>,
  ): Promise<AuditLog> {
    const logEntry = this.auditLogRepository.create({
      id: crypto.randomUUID(),
      claimId,
      fromState,
      toState,
      triggeredByUserId: triggeredBy.userId,
      triggeredByRole: triggeredBy.role,
      reason: reason || 'State transition',
      context: context || {},
    });

    const saved = await this.auditLogRepository.save(logEntry);
    
    // Map to DTO, deep freeze, and return to guarantee tamper-resistance
    const mapped = this.mapToDto(saved);
    this.deepFreeze(mapped);
    return mapped;
  }

  /**
   * Find audit history for a specific claim. Returns deep-frozen copies.
   */
  async findByClaimId(claimId: string): Promise<AuditLog[]> {
    const logs = await this.auditLogRepository.find({
      where: { claimId },
      order: { timestamp: 'ASC' },
    });
    
    return logs.map((log) => {
      const mapped = this.mapToDto(log);
      this.deepFreeze(mapped);
      return mapped;
    });
  }

  /**
   * Dump all audit logs. Returns deep-frozen copies.
   */
  async findAll(): Promise<AuditLog[]> {
    const logs = await this.auditLogRepository.find({
      order: { timestamp: 'ASC' },
    });
    
    return logs.map((log) => {
      const mapped = this.mapToDto(log);
      this.deepFreeze(mapped);
      return mapped;
    });
  }

  // Map database entity to standard AuditLog DTO
  private mapToDto(entity: AuditLogEntity): AuditLog {
    return {
      id: entity.id,
      claimId: entity.claimId,
      timestamp: entity.timestamp instanceof Date ? entity.timestamp.toISOString() : new Date(entity.timestamp).toISOString(),
      fromState: entity.fromState,
      toState: entity.toState,
      triggeredBy: {
        userId: entity.triggeredByUserId,
        role: entity.triggeredByRole,
      },
      reason: entity.reason,
      context: entity.context || {},
    };
  }

  // Deep freeze utility to seal DTO objects in memory
  private deepFreeze(object: any): any {
    const propNames = Reflect.ownKeys(object);
    for (const name of propNames) {
      const value = object[name];
      if ((value && typeof value === 'object') || typeof value === 'function') {
        this.deepFreeze(value);
      }
    }
    return Object.freeze(object);
  }
}
