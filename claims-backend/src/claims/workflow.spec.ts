import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsService } from './claims.service';
import { WorkflowEngineService } from '../engine/workflow-engine.service';
import { AuditTrailService } from '../engine/audit-trail.service';
import { ClaimEntity } from '../engine/entities/claim.entity';
import { AuditLogEntity } from '../engine/entities/audit-log.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('WorkflowEngine & ClaimsService Integration Suite', () => {
  let claimsService: ClaimsService;
  let auditTrailService: AuditTrailService;
  let workflowEngine: WorkflowEngineService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        // Configure TypeORM with lightweight SQLite in-memory for fast, portable tests
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [ClaimEntity, AuditLogEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ClaimEntity, AuditLogEntity]),
      ],
      providers: [ClaimsService, WorkflowEngineService, AuditTrailService],
    }).compile();

    claimsService = moduleRef.get<ClaimsService>(ClaimsService);
    auditTrailService = moduleRef.get<AuditTrailService>(AuditTrailService);
    workflowEngine = moduleRef.get<WorkflowEngineService>(WorkflowEngineService);

    // Call onModuleInit manually because Nest module lifecycle is not automatically triggered in unit tests
    workflowEngine.onModuleInit();
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  // Test 1: Happy Path
  it('should transition a claim through the complete happy path successfully', async () => {
    const claim = await claimsService.create({ metadata: { name: 'Happy Claim' } });
    const claimId = claim.claimId;

    expect(claim.currentState).toBe('SUBMITTED');
    expect(claim.cycleCount).toBe(0);

    // 1. SUBMITTED -> DOCUMENTS_VERIFIED
    const res1 = await claimsService.transition(claimId, {
      role: 'document_clerk',
      userId: 'clk_01',
      toState: 'DOCUMENTS_VERIFIED',
      reason: 'Verify files',
      context: { allDocumentsPresent: true },
    });
    expect(res1.success).toBe(true);
    expect(res1.claim.currentState).toBe('DOCUMENTS_VERIFIED');

    // 2. DOCUMENTS_VERIFIED -> UNDER_ASSESSMENT
    const res2 = await claimsService.transition(claimId, {
      role: 'team_lead',
      userId: 'tl_01',
      toState: 'UNDER_ASSESSMENT',
      reason: 'Assigning to assessor',
      context: { assessorAssigned: true },
    });
    expect(res2.success).toBe(true);
    expect(res2.claim.currentState).toBe('UNDER_ASSESSMENT');

    // 3. UNDER_ASSESSMENT -> APPROVED
    const res3 = await claimsService.transition(claimId, {
      role: 'assessor',
      userId: 'asr_01',
      toState: 'APPROVED',
      reason: 'Under policy limit',
      context: { assessmentReportComplete: true, claimAmount: 1400, policyLimit: 1500 },
    });
    expect(res3.success).toBe(true);
    expect(res3.claim.currentState).toBe('APPROVED');

    // 4. APPROVED -> PAYMENT_INITIATED
    const res4 = await claimsService.transition(claimId, {
      role: 'finance',
      userId: 'fin_01',
      toState: 'PAYMENT_INITIATED',
      reason: 'Create wire',
      context: { paymentRequestCreated: true },
    });
    expect(res4.success).toBe(true);
    expect(res4.claim.currentState).toBe('PAYMENT_INITIATED');

    // 5. PAYMENT_INITIATED -> CLOSED
    const res5 = await claimsService.transition(claimId, {
      role: 'finance',
      userId: 'fin_01',
      toState: 'CLOSED',
      reason: 'Reference confirmed',
      context: { paymentConfirmed: true },
    });
    expect(res5.success).toBe(true);
    expect(res5.claim.currentState).toBe('CLOSED');

    // Verify complete audit history
    const logs = await auditTrailService.findByClaimId(claimId);
    expect(logs.length).toBe(6); // 1 creation + 5 transitions
    expect(logs[0].toState).toBe('SUBMITTED');
    expect(logs[5].toState).toBe('CLOSED');
  });

  // Test 2: Rejection path
  it('should transition a claim through the rejection path to Closed state', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, {
      role: 'document_clerk',
      userId: 'clk',
      toState: 'DOCUMENTS_VERIFIED',
      reason: 'ok',
      context: { allDocumentsPresent: true },
    });

    await claimsService.transition(claimId, {
      role: 'team_lead',
      userId: 'tl',
      toState: 'UNDER_ASSESSMENT',
      reason: 'ok',
      context: { assessorAssigned: true },
    });

    // UNDER_ASSESSMENT -> REJECTED
    await claimsService.transition(claimId, {
      role: 'assessor',
      userId: 'asr',
      toState: 'REJECTED',
      reason: 'Exceeds limits',
      context: { assessmentReportComplete: true, rejectionReason: 'Treatment not covered' },
    });

    // REJECTED -> CLOSED (system role + appeal expired)
    const result = await claimsService.transition(claimId, {
      role: 'system',
      userId: 'sys',
      toState: 'CLOSED',
      reason: 'Appeal expired',
      context: { appealPeriodExpired: true },
    });

    expect(result.success).toBe(true);
    expect(result.claim.currentState).toBe('CLOSED');
  });

  // Test 3: Request More Info Loop (Boundary 1-3 cycles)
  it('should allow the PENDING_INFO loop up to 3 cycles and succeed', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    // Helper function to run one full loop: Verified -> Under Assessment -> Pending Info -> Verified
    const executeInfoLoop = async (cycleNum: number) => {
      // 1. Initial/Recover transition: SUBMITTED or PENDING_INFO -> DOCUMENTS_VERIFIED
      await claimsService.transition(claimId, {
        role: 'document_clerk',
        userId: 'clk',
        toState: 'DOCUMENTS_VERIFIED',
        reason: `Info received for loop ${cycleNum}`,
        context: cycleNum === 1 ? { allDocumentsPresent: true } : { newInfoReceived: true },
      });

      // 2. DOCUMENTS_VERIFIED -> UNDER_ASSESSMENT
      await claimsService.transition(claimId, {
        role: 'team_lead',
        userId: 'tl',
        toState: 'UNDER_ASSESSMENT',
        reason: 'ok',
        context: { assessorAssigned: true },
      });

      // 3. UNDER_ASSESSMENT -> PENDING_INFO
      const res = await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'PENDING_INFO',
        reason: `Need more details for loop ${cycleNum}`,
        context: { missingInfoDescription: 'Missing document sign-off' },
      });

      return res.claim;
    };

    let updatedClaim = await executeInfoLoop(1);
    expect(updatedClaim.cycleCount).toBe(1);

    updatedClaim = await executeInfoLoop(2);
    expect(updatedClaim.cycleCount).toBe(2);

    updatedClaim = await executeInfoLoop(3);
    expect(updatedClaim.cycleCount).toBe(3);
  });

  // Test 4: Request More Info Loop Exceeded (4th cycle block)
  it('should block the 4th attempt to request info, throwing escalation error', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    const executeInfoLoop = async (cycleNum: number) => {
      await claimsService.transition(claimId, {
        role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED',
        reason: 'ok', context: cycleNum === 1 ? { allDocumentsPresent: true } : { newInfoReceived: true },
      });
      await claimsService.transition(claimId, {
        role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT',
        reason: 'ok', context: { assessorAssigned: true },
      });
      await claimsService.transition(claimId, {
        role: 'assessor', userId: 'asr', toState: 'PENDING_INFO',
        reason: 'need info', context: { missingInfoDescription: 'desc' },
      });
    };

    await executeInfoLoop(1);
    await executeInfoLoop(2);
    await executeInfoLoop(3);

    // Prepare 4th attempt: PENDING_INFO -> DOCUMENTS_VERIFIED -> UNDER_ASSESSMENT
    await claimsService.transition(claimId, {
      role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED',
      reason: 'info uploaded', context: { newInfoReceived: true },
    });
    await claimsService.transition(claimId, {
      role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT',
      reason: 'ok', context: { assessorAssigned: true },
    });

    // 4th attempt to request info must fail!
    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'PENDING_INFO',
        reason: '4th request loop attempt',
        context: { missingInfoDescription: 'desc' },
      });
    }).rejects.toThrow(new BadRequestException('Maximum information requests exceeded — escalate to team lead'));
  });

  // Test 5: Invalid Transition direct jumping
  it('should reject a direct invalid state jump with detailed error', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'APPROVED',
        reason: 'Skipping steps',
        context: {},
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Invalid transition: cannot go directly from "SUBMITTED" to "APPROVED". ' +
        'Available states to transition to are: [DOCUMENTS_VERIFIED]',
      ),
    );
  });

  // Test 6: Unauthorized Role
  it('should reject transitions triggered by an unauthorized role', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor', // Assessor is not authorized to verify files
        userId: 'asr_01',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'Trying to help out',
        context: { allDocumentsPresent: true },
      });
    }).rejects.toThrow(
      new ForbiddenException(
        'User role "assessor" is not authorized to transition claim from "SUBMITTED" to "DOCUMENTS_VERIFIED". ' +
        'Authorized roles are: [document_clerk]',
      ),
    );
  });

  // Test 7: Precondition Fail - Missing Documents
  it('should fail SUBMITTED -> DOCUMENTS_VERIFIED when allDocumentsPresent is false', async () => {
    const claim = await claimsService.create({});
    await expect(async () => {
      await claimsService.transition(claim.claimId, {
        role: 'document_clerk',
        userId: 'clk',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'Missing files',
        context: { allDocumentsPresent: false },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "SUBMITTED" -> "DOCUMENTS_VERIFIED": All required documents must be present',
      ),
    );
  });

  // Test 8: Precondition Fail - Assessor not assigned
  it('should fail DOCUMENTS_VERIFIED -> UNDER_ASSESSMENT when assessorAssigned is false', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, {
      role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED',
      reason: 'ok', context: { allDocumentsPresent: true },
    });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'team_lead',
        userId: 'tl',
        toState: 'UNDER_ASSESSMENT',
        reason: 'No assignee',
        context: { assessorAssigned: false },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "DOCUMENTS_VERIFIED" -> "UNDER_ASSESSMENT": An assessor must be assigned to the claim',
      ),
    );
  });

  // Test 9: Precondition Fail - Report not complete (Approval attempt)
  it('should fail UNDER_ASSESSMENT -> APPROVED when assessmentReportComplete is false', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'APPROVED',
        reason: 'Approved',
        context: { assessmentReportComplete: false, claimAmount: 100, policyLimit: 1000 },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "UNDER_ASSESSMENT" -> "APPROVED": The assessment report must be complete',
      ),
    );
  });

  // Test 10: Precondition Fail - Limit Exceeded (Amount > Policy)
  it('should fail UNDER_ASSESSMENT -> APPROVED when claimAmount exceeds policyLimit', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'APPROVED',
        reason: 'Approved',
        context: { assessmentReportComplete: true, claimAmount: 2500, policyLimit: 2000 },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "UNDER_ASSESSMENT" -> "APPROVED": The claim amount must not exceed the policy limit',
      ),
    );
  });

  // Test 11: Precondition Fail - Rejection reason missing
  it('should fail UNDER_ASSESSMENT -> REJECTED when rejectionReason is missing or empty', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'REJECTED',
        reason: 'Deny',
        context: { assessmentReportComplete: true, rejectionReason: '' },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "UNDER_ASSESSMENT" -> "REJECTED": A rejection reason must be provided',
      ),
    );
  });

  // Test 12: Precondition Fail - Missing info details not provided
  it('should fail UNDER_ASSESSMENT -> PENDING_INFO when missingInfoDescription is missing or empty', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'PENDING_INFO',
        reason: 'Hold',
        context: { missingInfoDescription: '' },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "UNDER_ASSESSMENT" -> "PENDING_INFO": A description of the missing information must be provided',
      ),
    );
  });

  // Test 13: Precondition Fail - New info uploaded flag false
  it('should fail PENDING_INFO -> DOCUMENTS_VERIFIED when newInfoReceived is false', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });
    await claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'PENDING_INFO', reason: 'h', context: { missingInfoDescription: 'needs file' } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'document_clerk',
        userId: 'clk',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'Still missing',
        context: { newInfoReceived: false },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "PENDING_INFO" -> "DOCUMENTS_VERIFIED": New documents or info must be received',
      ),
    );
  });

  // Test 14: Precondition Fail - Payment Request missing
  it('should fail APPROVED -> PAYMENT_INITIATED when paymentRequestCreated is false', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });
    await claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'APPROVED', reason: 'o', context: { assessmentReportComplete: true, claimAmount: 100, policyLimit: 200 } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'finance',
        userId: 'fin',
        toState: 'PAYMENT_INITIATED',
        reason: 'pay',
        context: { paymentRequestCreated: false },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "APPROVED" -> "PAYMENT_INITIATED": A payment request must have been created',
      ),
    );
  });

  // Test 15: Precondition Fail - Logical OR appeal expired OR member acknowledged
  it('should fail REJECTED -> CLOSED when BOTH appealPeriodExpired and memberAcknowledged are false', async () => {
    const claim = await claimsService.create({});
    const claimId = claim.claimId;

    await claimsService.transition(claimId, { role: 'document_clerk', userId: 'c', toState: 'DOCUMENTS_VERIFIED', reason: 'o', context: { allDocumentsPresent: true } });
    await claimsService.transition(claimId, { role: 'team_lead', userId: 't', toState: 'UNDER_ASSESSMENT', reason: 'o', context: { assessorAssigned: true } });
    await claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'REJECTED', reason: 'o', context: { assessmentReportComplete: true, rejectionReason: 'r' } });

    await expect(async () => {
      await claimsService.transition(claimId, {
        role: 'system',
        userId: 'sys',
        toState: 'CLOSED',
        reason: 'Close attempt',
        context: { appealPeriodExpired: false, memberAcknowledged: false },
      });
    }).rejects.toThrow(
      new BadRequestException(
        'Precondition failed for transition "REJECTED" -> "CLOSED": The appeal period must have expired OR the member must have acknowledged the rejection',
      ),
    );
  });

  // Test 16: Audit Trail Immutability checks
  it('should enforce that logs written to AuditTrailService are immutable and frozen', async () => {
    const claim = await claimsService.create({});
    
    const logs = await auditTrailService.findByClaimId(claim.claimId);
    expect(logs.length).toBe(1);
    
    const initialLog = logs[0];
    
    // Attempting to modify properties of returned logs should throw TypeError because object is frozen
    expect(() => {
      (initialLog as any).toState = 'CLOSED';
    }).toThrow();
    
    // Check direct query cloning: even if a user bypasses freeze, clones protect inner array references
    const allLogs = await auditTrailService.findAll();
    expect(allLogs[0]).not.toBe(logs[0]); // Decoupled clone copies
  });

  // Test 17: Configuration Validation for Side Effects
  it('should throw an error during onModuleInit if workflow configuration has invalid side effects', () => {
    const serviceWithInvalidConfig = new WorkflowEngineService(auditTrailService);
    
    // Stub fs.readFileSync to return an invalid configuration with unrecognized side effect
    const invalidConfig = {
      states: { SUBMITTED: 'Submitted', CLOSED: 'Closed' },
      transitions: [
        {
          from: 'SUBMITTED',
          to: 'CLOSED',
          authorizedRoles: ['system'],
          preconditions: [],
          sideEffects: ['nonExistentSideEffect'], // Invalid!
        },
      ],
    };

    jest.spyOn(require('fs'), 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

    expect(() => {
      serviceWithInvalidConfig.onModuleInit();
    }).toThrow(/Invalid side effect "nonExistentSideEffect" defined in workflow configuration transitions/);

    jest.restoreAllMocks();
  });
});
