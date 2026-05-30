import { Injectable, BadRequestException } from '@nestjs/common';
import { ClaimsService } from '../claims/claims.service';
import { AuditTrailService } from '../engine/audit-trail.service';
import { AuditLog } from '../engine/types';

export interface ScenarioReport {
  scenarioNumber: number;
  name: string;
  description: string;
  success: boolean;
  claimId: string;
  finalState: string;
  cycleCount: number;
  stepsExecuted: Array<{
    step: number;
    description: string;
    from: string;
    to: string;
    role: string;
    success: boolean;
    error?: string;
  }>;
  auditTrail: AuditLog[];
}

@Injectable()
export class ScenariosService {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  /**
   * Run a specific programmatic scenario by index (1 to 6) asynchronously
   */
  async runScenario(index: number): Promise<ScenarioReport> {
    switch (index) {
      case 1:
        return await this.runHappyPath();
      case 2:
        return await this.runRejectionPath();
      case 3:
        return await this.runRequestInfoLoop();
      case 4:
        return await this.runInvalidTransition();
      case 5:
        return await this.runUnauthorizedRole();
      case 6:
        return await this.runInfoLoopExceededLimit();
      default:
        throw new BadRequestException(`Scenario index ${index} is invalid. Choose from 1 to 6.`);
    }
  }

  /**
   * Scenario 1: Happy Path
   */
  private async runHappyPath(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Dental crown replacement claim', patientName: 'John Doe' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let currentStep = 1;

    try {
      // Step 1: Submit -> Documents Verified
      await this.claimsService.transition(claimId, {
        role: 'document_clerk',
        userId: 'clerk_01',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'All files checked',
        context: { allDocumentsPresent: true },
      });
      steps.push({ step: currentStep++, description: 'Verify Documents', from: 'SUBMITTED', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      // Step 2: Documents Verified -> Under Assessment
      await this.claimsService.transition(claimId, {
        role: 'team_lead',
        userId: 'lead_01',
        toState: 'UNDER_ASSESSMENT',
        reason: 'Assigning to senior assessor',
        context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      // Step 3: Under Assessment -> Approved
      await this.claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'assessor_01',
        toState: 'APPROVED',
        reason: 'Assessment report finished, claim cost within policy terms',
        context: { assessmentReportComplete: true, claimAmount: 1200, policyLimit: 2000 },
      });
      steps.push({ step: currentStep++, description: 'Approve Claim', from: 'UNDER_ASSESSMENT', to: 'APPROVED', role: 'assessor', success: true });

      // Step 4: Approved -> Payment Initiated
      await this.claimsService.transition(claimId, {
        role: 'finance',
        userId: 'fin_01',
        toState: 'PAYMENT_INITIATED',
        reason: 'Bank transfer instruction queued',
        context: { paymentRequestCreated: true },
      });
      steps.push({ step: currentStep++, description: 'Initiate Payment', from: 'APPROVED', to: 'PAYMENT_INITIATED', role: 'finance', success: true });

      // Step 5: Payment Initiated -> Closed
      await this.claimsService.transition(claimId, {
        role: 'finance',
        userId: 'fin_01',
        toState: 'CLOSED',
        reason: 'Bank wire reference recorded',
        context: { paymentConfirmed: true, paymentReference: 'TXN-908129038' },
      });
      steps.push({ step: currentStep++, description: 'Close Claim', from: 'PAYMENT_INITIATED', to: 'CLOSED', role: 'finance', success: true });

    } catch (e: any) {
      steps.push({ step: currentStep, description: 'Failure', from: 'UNKNOWN', to: 'UNKNOWN', role: 'UNKNOWN', success: false, error: e.message });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 1,
      name: 'Happy Path',
      description: 'Progress claim fully: Submitted -> Documents Verified -> Under Assessment -> Approved -> Payment Initiated -> Closed',
      success: finalClaim.currentState === 'CLOSED',
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }

  /**
   * Scenario 2: Rejection Path
   */
  private async runRejectionPath(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Cosmetic surgical procedure claim', patientName: 'Jane Smith' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let currentStep = 1;

    try {
      // Step 1: Submit -> Documents Verified
      await this.claimsService.transition(claimId, {
        role: 'document_clerk',
        userId: 'clerk_01',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'Paperwork present',
        context: { allDocumentsPresent: true },
      });
      steps.push({ step: currentStep++, description: 'Verify Documents', from: 'SUBMITTED', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      // Step 2: Documents Verified -> Under Assessment
      await this.claimsService.transition(claimId, {
        role: 'team_lead',
        userId: 'lead_01',
        toState: 'UNDER_ASSESSMENT',
        reason: 'Assessment workload assignment',
        context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      // Step 3: Under Assessment -> Rejected
      await this.claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'assessor_01',
        toState: 'REJECTED',
        reason: 'Cosmetic enhancements are excluded from standard medical benefit policies.',
        context: { assessmentReportComplete: true, rejectionReason: 'Excluded cosmetic procedure' },
      });
      steps.push({ step: currentStep++, description: 'Reject Claim', from: 'UNDER_ASSESSMENT', to: 'REJECTED', role: 'assessor', success: true });

      // Step 4: Rejected -> Closed
      await this.claimsService.transition(claimId, {
        role: 'system',
        userId: 'sys_01',
        toState: 'CLOSED',
        reason: 'Appeal period lapsed without response',
        context: { appealPeriodExpired: true },
      });
      steps.push({ step: currentStep++, description: 'Close (Archive)', from: 'REJECTED', to: 'CLOSED', role: 'system', success: true });

    } catch (e: any) {
      steps.push({ step: currentStep, description: 'Failure', from: 'UNKNOWN', to: 'UNKNOWN', role: 'UNKNOWN', success: false, error: e.message });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 2,
      name: 'Rejection Path',
      description: 'Reject claim and close: Submitted -> Documents Verified -> Under Assessment -> Rejected -> Closed',
      success: finalClaim.currentState === 'CLOSED',
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }

  /**
   * Scenario 3: Request More Info Loop
   */
  private async runRequestInfoLoop(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Physical therapy sessions', patientName: 'Alice Green' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let currentStep = 1;

    try {
      // Loop 1
      await this.claimsService.transition(claimId, {
        role: 'document_clerk', userId: 'clerk_01', toState: 'DOCUMENTS_VERIFIED',
        reason: 'Files received', context: { allDocumentsPresent: true },
      });
      steps.push({ step: currentStep++, description: 'L1: Verify Docs', from: 'SUBMITTED', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      await this.claimsService.transition(claimId, {
        role: 'team_lead', userId: 'lead_01', toState: 'UNDER_ASSESSMENT',
        reason: 'Assigned', context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'L1: Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      await this.claimsService.transition(claimId, {
        role: 'assessor', userId: 'assessor_01', toState: 'PENDING_INFO',
        reason: 'Requires clinical history sheets', context: { missingInfoDescription: 'Provide clinical history' },
      });
      steps.push({ step: currentStep++, description: 'L1: Request Info (Cycle 1)', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Loop 2
      await this.claimsService.transition(claimId, {
        role: 'document_clerk', userId: 'clerk_01', toState: 'DOCUMENTS_VERIFIED',
        reason: 'Clinic history uploaded', context: { newInfoReceived: true },
      });
      steps.push({ step: currentStep++, description: 'L2: Receive Info', from: 'PENDING_INFO', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      await this.claimsService.transition(claimId, {
        role: 'team_lead', userId: 'lead_01', toState: 'UNDER_ASSESSMENT',
        reason: 'Assigned back', context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'L2: Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      await this.claimsService.transition(claimId, {
        role: 'assessor', userId: 'assessor_01', toState: 'PENDING_INFO',
        reason: 'Missing doctor signature', context: { missingInfoDescription: 'Requires physician signature' },
      });
      steps.push({ step: currentStep++, description: 'L2: Request Info (Cycle 2)', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Loop 3
      await this.claimsService.transition(claimId, {
        role: 'document_clerk', userId: 'clerk_01', toState: 'DOCUMENTS_VERIFIED',
        reason: 'Signed copy uploaded', context: { newInfoReceived: true },
      });
      steps.push({ step: currentStep++, description: 'L3: Receive Info', from: 'PENDING_INFO', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      await this.claimsService.transition(claimId, {
        role: 'team_lead', userId: 'lead_01', toState: 'UNDER_ASSESSMENT',
        reason: 'Re-assign', context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'L3: Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      await this.claimsService.transition(claimId, {
        role: 'assessor', userId: 'assessor_01', toState: 'PENDING_INFO',
        reason: 'Requires clinic address and seal', context: { missingInfoDescription: 'Requires clinic address and seal' },
      });
      steps.push({ step: currentStep++, description: 'L3: Request Info (Cycle 3)', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Final Path to Approved & Closed
      await this.claimsService.transition(claimId, {
        role: 'document_clerk', userId: 'clerk_01', toState: 'DOCUMENTS_VERIFIED',
        reason: 'Full seal documents submitted', context: { newInfoReceived: true },
      });
      steps.push({ step: currentStep++, description: 'Final: Receive Info', from: 'PENDING_INFO', to: 'DOCUMENTS_VERIFIED', role: 'document_clerk', success: true });

      await this.claimsService.transition(claimId, {
        role: 'team_lead', userId: 'lead_01', toState: 'UNDER_ASSESSMENT',
        reason: 'Assigned for approval', context: { assessorAssigned: true },
      });
      steps.push({ step: currentStep++, description: 'Final: Assign Assessor', from: 'DOCUMENTS_VERIFIED', to: 'UNDER_ASSESSMENT', role: 'team_lead', success: true });

      await this.claimsService.transition(claimId, {
        role: 'assessor', userId: 'assessor_01', toState: 'APPROVED',
        reason: 'Completed, all information present now', context: { assessmentReportComplete: true, claimAmount: 800, policyLimit: 1000 },
      });
      steps.push({ step: currentStep++, description: 'Final: Approve Claim', from: 'UNDER_ASSESSMENT', to: 'APPROVED', role: 'assessor', success: true });

      await this.claimsService.transition(claimId, {
        role: 'finance', userId: 'fin_01', toState: 'PAYMENT_INITIATED',
        reason: 'Transfer instruction sent', context: { paymentRequestCreated: true },
      });
      steps.push({ step: currentStep++, description: 'Final: Initiate Payment', from: 'APPROVED', to: 'PAYMENT_INITIATED', role: 'finance', success: true });

      await this.claimsService.transition(claimId, {
        role: 'finance', userId: 'fin_01', toState: 'CLOSED',
        reason: 'Cleared', context: { paymentConfirmed: true },
      });
      steps.push({ step: currentStep++, description: 'Final: Close Claim', from: 'PAYMENT_INITIATED', to: 'CLOSED', role: 'finance', success: true });

    } catch (e: any) {
      steps.push({ step: currentStep, description: 'Failure occurred', from: 'UNKNOWN', to: 'UNKNOWN', role: 'UNKNOWN', success: false, error: e.message });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 3,
      name: 'Info Loop Path',
      description: 'Loop through PENDING_INFO maximum allowable times (3 cycles), and then proceed to approval and closure.',
      success: finalClaim.currentState === 'CLOSED' && finalClaim.cycleCount === 3,
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }

  /**
   * Scenario 4: Invalid Transition
   */
  private async runInvalidTransition(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Emergency MRI claim', patientName: 'Bob Vance' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let isFlipped = false;

    try {
      // Direct transition SUBMITTED -> APPROVED (should fail)
      await this.claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'assessor_01',
        toState: 'APPROVED',
        reason: 'Fast-track emergency approval attempt',
        context: { assessmentReportComplete: true, claimAmount: 500, policyLimit: 2000 },
      });
      steps.push({ step: 1, description: 'Invalid Fast-Track Jump', from: 'SUBMITTED', to: 'APPROVED', role: 'assessor', success: true });
    } catch (e: any) {
      isFlipped = true;
      steps.push({
        step: 1,
        description: 'Invalid Fast-Track Jump (Intercepted)',
        from: 'SUBMITTED',
        to: 'APPROVED',
        role: 'assessor',
        success: false,
        error: e.message,
      });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 4,
      name: 'Invalid Transition Path',
      description: 'Attempt direct transition from SUBMITTED to APPROVED (must fail with clear transition map error)',
      success: isFlipped && finalClaim.currentState === 'SUBMITTED',
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }

  /**
   * Scenario 5: Unauthorized Role
   */
  private async runUnauthorizedRole(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Optical eyeglasses claim', patientName: 'Pam Beesly' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let isFlipped = false;

    try {
      // Attempt SUBMITTED -> DOCUMENTS_VERIFIED with 'assessor' instead of 'document_clerk'
      await this.claimsService.transition(claimId, {
        role: 'assessor', // INCORRECT ROLE
        userId: 'assessor_01',
        toState: 'DOCUMENTS_VERIFIED',
        reason: 'Verifying files as assessor',
        context: { allDocumentsPresent: true },
      });
      steps.push({ step: 1, description: 'Clerk work by Assessor', from: 'SUBMITTED', to: 'DOCUMENTS_VERIFIED', role: 'assessor', success: true });
    } catch (e: any) {
      isFlipped = true;
      steps.push({
        step: 1,
        description: 'Clerk work by Assessor (Intercepted)',
        from: 'SUBMITTED',
        to: 'DOCUMENTS_VERIFIED',
        role: 'assessor',
        success: false,
        error: e.message,
      });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 5,
      name: 'Unauthorized Role Path',
      description: 'Attempt transition from SUBMITTED to DOCUMENTS_VERIFIED using authorized role "assessor" (must fail)',
      success: isFlipped && finalClaim.currentState === 'SUBMITTED',
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }

  /**
   * Scenario 6 (Bonus): Request info loop exceeded limit
   */
  private async runInfoLoopExceededLimit(): Promise<ScenarioReport> {
    const claim = await this.claimsService.create({
      metadata: { description: 'Exceeded cycle counts claim', patientName: 'Clara Oswald' },
    });
    const claimId = claim.claimId;
    const steps: ScenarioReport['stepsExecuted'] = [];
    let currentStep = 1;
    let isFlipped = false;

    try {
      // Cycle 1
      await this.claimsService.transition(claimId, { role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED', reason: 'ok', context: { allDocumentsPresent: true } });
      await this.claimsService.transition(claimId, { role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT', reason: 'ok', context: { assessorAssigned: true } });
      await this.claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'PENDING_INFO', reason: 'r1', context: { missingInfoDescription: 'desc' } });
      steps.push({ step: currentStep++, description: 'Cycle 1 Completed', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Cycle 2
      await this.claimsService.transition(claimId, { role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED', reason: 'ok', context: { newInfoReceived: true } });
      await this.claimsService.transition(claimId, { role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT', reason: 'ok', context: { assessorAssigned: true } });
      await this.claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'PENDING_INFO', reason: 'r2', context: { missingInfoDescription: 'desc' } });
      steps.push({ step: currentStep++, description: 'Cycle 2 Completed', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Cycle 3
      await this.claimsService.transition(claimId, { role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED', reason: 'ok', context: { newInfoReceived: true } });
      await this.claimsService.transition(claimId, { role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT', reason: 'ok', context: { assessorAssigned: true } });
      await this.claimsService.transition(claimId, { role: 'assessor', userId: 'asr', toState: 'PENDING_INFO', reason: 'r3', context: { missingInfoDescription: 'desc' } });
      steps.push({ step: currentStep++, description: 'Cycle 3 Completed', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

      // Cycle 4
      await this.claimsService.transition(claimId, { role: 'document_clerk', userId: 'clk', toState: 'DOCUMENTS_VERIFIED', reason: 'ok', context: { newInfoReceived: true } });
      await this.claimsService.transition(claimId, { role: 'team_lead', userId: 'tl', toState: 'UNDER_ASSESSMENT', reason: 'ok', context: { assessorAssigned: true } });
      
      // Attempt 4th transition to PENDING_INFO
      await this.claimsService.transition(claimId, {
        role: 'assessor',
        userId: 'asr',
        toState: 'PENDING_INFO',
        reason: 'Attempting 4th request loop',
        context: { missingInfoDescription: 'desc' },
      });
      steps.push({ step: currentStep++, description: 'Cycle 4 Attempt', from: 'UNDER_ASSESSMENT', to: 'PENDING_INFO', role: 'assessor', success: true });

    } catch (e: any) {
      isFlipped = true;
      steps.push({
        step: currentStep,
        description: 'Cycle 4 Attempt (Intercepted)',
        from: 'UNDER_ASSESSMENT',
        to: 'PENDING_INFO',
        role: 'assessor',
        success: false,
        error: e.message,
      });
    }

    const finalClaim = await this.claimsService.findOne(claimId);
    return {
      scenarioNumber: 6,
      name: 'Loop Limit Block Path',
      description: 'Attempt to issue more info requests 4 times. 4th attempt must be rejected with team lead escalation notice.',
      success: isFlipped && finalClaim.currentState === 'UNDER_ASSESSMENT' && finalClaim.cycleCount === 3,
      claimId,
      finalState: finalClaim.currentState,
      cycleCount: finalClaim.cycleCount,
      stepsExecuted: steps,
      auditTrail: await this.auditTrailService.findByClaimId(claimId),
    };
  }
}
