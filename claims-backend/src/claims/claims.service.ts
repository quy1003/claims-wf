import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClaimEntity } from '../engine/entities/claim.entity';
import { Claim, CreateClaimDto, TransitionClaimDto, TransitionResult, TriggeredBy } from '../engine/types';
import { WorkflowEngineService } from '../engine/workflow-engine.service';
import { AuditTrailService } from '../engine/audit-trail.service';
import { ClaimState, SYSTEM_USER } from '../engine/constants';
import * as crypto from 'crypto';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(ClaimEntity)
    private readonly claimRepository: Repository<ClaimEntity>,
    private readonly dataSource: DataSource,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  /**
   * Create a new claim in database.
   * Runs in an atomic transaction to ensure claim row and initial audit entry are created together.
   */
  async create(dto: CreateClaimDto, user: TriggeredBy = SYSTEM_USER): Promise<Claim> {
    const claimId = dto.claimId || `CLM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Verify if claim ID is already allocated
    const existing = await this.claimRepository.findOne({ where: { claimId } });
    if (existing) {
      throw new BadRequestException(`Claim with ID "${claimId}" already exists.`);
    }

    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Create and save claim row
      const newClaim = transactionalEntityManager.create(ClaimEntity, {
        claimId,
        currentState: ClaimState.SUBMITTED,
        cycleCount: 0,
        metadata: dto.metadata || {},
      });

      const saved = await transactionalEntityManager.save(newClaim);

      // 2. Register initial audit trail entry
      await this.auditTrailService.create(
        claimId,
        null, // fromState is null on creation
        ClaimState.SUBMITTED,
        user,
        'Initial claim submission',
        dto.metadata || {},
        transactionalEntityManager,
      );

      return this.mapToDto(saved);
    });
  }

  /**
   * Retrieve all claims from database.
   */
  async findAll(): Promise<Claim[]> {
    const claims = await this.claimRepository.find({
      order: { createdAt: 'DESC' },
    });
    return claims.map((claim) => this.mapToDto(claim));
  }

  /**
   * Retrieve a specific claim by ID.
   */
  async findOne(claimId: string): Promise<Claim> {
    const claim = await this.claimRepository.findOne({ where: { claimId } });
    if (!claim) {
      throw new NotFoundException(`Claim with ID "${claimId}" was not found.`);
    }
    return this.mapToDto(claim);
  }

  /**
   * Transition a claim's state using an atomic database transaction.
   * If any step (precondition fail, role check, cycle limit) throws an error, the transaction rolls back.
   */
  async transition(claimId: string, dto: TransitionClaimDto, user?: TriggeredBy): Promise<TransitionResult> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // Fetch claim row inside the transaction
      const claimEntity = await transactionalEntityManager.findOne(ClaimEntity, {
        where: { claimId },
      });

      if (!claimEntity) {
        throw new NotFoundException(`Claim with ID "${claimId}" was not found.`);
      }

      const claim = this.mapToDto(claimEntity);

      const caller: TriggeredBy = user || { userId: dto.userId!, role: dto.role! };

      // Run transition checks via the state engine (persists the audit log in the database)
      const result = await this.workflowEngine.executeTransition(
        claim,
        dto.toState,
        caller,
        dto.reason,
        dto.context || {},
        transactionalEntityManager,
      );

      // Update the claim entity inside the transaction
      claimEntity.currentState = result.claim.currentState;
      claimEntity.cycleCount = result.claim.cycleCount;
      claimEntity.metadata = result.claim.metadata;

      await transactionalEntityManager.save(claimEntity);

      return {
        success: result.success,
        claim: this.mapToDto(claimEntity),
        auditLog: result.auditLog,
        sideEffectsExecuted: result.sideEffectsExecuted,
      };
    });
  }

  // Helper mapper to transform database entity to clean DTO structure
  private mapToDto(entity: ClaimEntity): Claim {
    return {
      claimId: entity.claimId,
      currentState: entity.currentState,
      cycleCount: entity.cycleCount,
      metadata: entity.metadata || {},
      createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : new Date(entity.createdAt).toISOString(),
      updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : new Date(entity.updatedAt).toISOString(),
    };
  }
}
