import { Injectable, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { BasePrecondition, Claim, TransitionConfig, TransitionResult, WorkflowConfig, TriggeredBy } from './types';
import { AuditTrailService } from './audit-trail.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private config!: WorkflowConfig;

  constructor(private readonly auditTrailService: AuditTrailService) {}

  /**
   * Load the workflow configuration dynamically.
   */
  onModuleInit() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'workflow-config.json');
      const rawData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(rawData);
      console.log('Workflow configuration successfully loaded.');
    } catch (error) {
      console.error('Failed to load workflow configuration:', error);
      throw new Error('Workflow configuration initialization failed.');
    }
  }

  /**
   * Fetch current configuration
   */
  getConfig(): WorkflowConfig {
    return this.config;
  }

  /**
   * Verify if a state transition is currently valid
   */
  validateTransition(
    claim: Claim,
    toState: string,
    triggeredBy: TriggeredBy,
    context: Record<string, any>,
  ): TransitionConfig {
    const { currentState } = claim;
    const { role } = triggeredBy;

    // Check if the toState is defined in configuration
    if (!this.config.states[toState]) {
      throw new BadRequestException(`Target state "${toState}" is not defined in the workflow states.`);
    }

    // Find allowed transitions from the current state
    const allowedTransitions = this.config.transitions.filter(
      (t) => t.from === currentState,
    );

    if (allowedTransitions.length === 0) {
      throw new BadRequestException(`No transitions are allowed from current state "${currentState}".`);
    }

    // Find the specific transition to the target state
    const transition = allowedTransitions.find((t) => t.to === toState);
    if (!transition) {
      const availableToStates = allowedTransitions.map((t) => t.to).join(', ');
      throw new BadRequestException(
        `Invalid transition: cannot go directly from "${currentState}" to "${toState}". ` +
        `Available states to transition to are: [${availableToStates}]`,
      );
    }

    // Check Role authorization
    if (!transition.authorizedRoles.includes(role)) {
      throw new ForbiddenException(
        `User role "${role}" is not authorized to transition claim from "${currentState}" to "${toState}". ` +
        `Authorized roles are: [${transition.authorizedRoles.join(', ')}]`,
      );
    }

    // Check Cycle Limit for UNDER_ASSESSMENT -> PENDING_INFO loop
    if (currentState === 'UNDER_ASSESSMENT' && toState === 'PENDING_INFO') {
      if (claim.cycleCount >= 3) {
        throw new BadRequestException(
          'Maximum information requests exceeded — escalate to team lead',
        );
      }
    }

    // Evaluate preconditions
    for (const precondition of transition.preconditions) {
      const passed = this.evaluatePrecondition(precondition, context);
      if (!passed) {
        throw new BadRequestException(
          `Precondition failed for transition "${currentState}" -> "${toState}": ${precondition.errorMessage}`,
        );
      }
    }

    return transition;
  }

  /**
   * Execute state transition, increment cycle counts, write immutable log, and run mock side effects.
   */
  async executeTransition(
    claim: Claim,
    toState: string,
    triggeredBy: TriggeredBy,
    reason: string,
    context: Record<string, any> = {},
  ): Promise<TransitionResult> {
    // 1. Validate transition
    const transitionConfig = this.validateTransition(claim, toState, triggeredBy, context);

    const fromState = claim.currentState;

    // 2. Perform state update
    claim.currentState = toState;
    claim.updatedAt = new Date().toISOString();

    // Store context variables inside claim metadata
    claim.metadata = {
      ...claim.metadata,
      ...context,
    };

    // If returning from UNDER_ASSESSMENT to PENDING_INFO, increment cycle count
    if (fromState === 'UNDER_ASSESSMENT' && toState === 'PENDING_INFO') {
      claim.cycleCount += 1;
      claim.metadata.cycleCount = claim.cycleCount;
    }

    // 3. Create Audit Trail Entry (PERSISTED IN DB)
    const auditLog = await this.auditTrailService.create(
      claim.claimId,
      fromState,
      toState,
      triggeredBy,
      reason,
      context,
    );

    // 4. Run Side Effects (Mock logs to console)
    const sideEffectsExecuted: string[] = [];
    for (const effect of transitionConfig.sideEffects) {
      this.triggerMockSideEffect(effect, claim, triggeredBy);
      sideEffectsExecuted.push(effect);
    }

    return {
      success: true,
      claim,
      auditLog,
      sideEffectsExecuted,
    };
  }

  /**
   * Evaluates a precondition recursively.
   */
  private evaluatePrecondition(condition: BasePrecondition, context: Record<string, any>): boolean {
    if (condition.operator === 'or') {
      if (!condition.conditions || condition.conditions.length === 0) {
        return false;
      }
      return condition.conditions.some((subCond) =>
        this.evaluatePrecondition(subCond, context),
      );
    }

    const { field, operator, value, compareField } = condition;
    if (!field) return false;

    const fieldValue = context[field];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'notEmpty':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'lessThanOrEqualField': {
        if (!compareField) return false;
        const compareValue = context[compareField];
        if (fieldValue === undefined || compareValue === undefined) return false;
        return Number(fieldValue) <= Number(compareValue);
      }
      default:
        return false;
    }
  }

  /**
   * Triggers a mock side effect log to console
   */
  private triggerMockSideEffect(effectName: string, claim: Claim, user: TriggeredBy) {
    const timestamp = new Date().toISOString();
    console.log(
      `\x1b[35m[SIDE EFFECT TRIGGERED]\x1b[0m [${timestamp}] Running "${effectName}" ` +
      `on Claim "${claim.claimId}" triggered by User "${user.userId}" (${user.role}).`,
    );

    // Dynamic messaging logs to mimic real downstream activities
    switch (effectName) {
      case 'notifyAssessorTeam':
        console.log(` > \x1b[36mNotification Sent:\x1b[0m Assessor Team alerted of new documents verified for Claim ${claim.claimId}`);
        break;
      case 'logAssessmentStartTime':
        console.log(` > \x1b[36mLog Registered:\x1b[0m Assessment timer initiated for Claim ${claim.claimId} at ${timestamp}`);
        break;
      case 'notifyMemberOfApproval':
        console.log(` > \x1b[36mNotification Sent:\x1b[0m Approval confirmation dispatched to claimant for Claim ${claim.claimId}`);
        break;
      case 'createPaymentRequest':
        console.log(` > \x1b[36mSystem Action:\x1b[0m Payment request scheduled in downstream billing queue for Claim ${claim.claimId}`);
        break;
      case 'notifyMemberOfRejectionWithAppealInstructions':
        console.log(
          ` > \x1b[36mNotification Sent:\x1b[0m Rejection alert dispatched to member. Reason: "${claim.metadata.rejectionReason}". ` +
          `Appeal manual delivered.`,
        );
        break;
      case 'notifyMemberOfMissingInfoRequest':
        console.log(
          ` > \x1b[36mNotification Sent:\x1b[0m Missing info request dispatched to member: "${claim.metadata.missingInfoDescription}"`,
        );
        break;
      case 'resetAssessmentTimer':
        console.log(` > \x1b[36mLog Registered:\x1b[0m Assessor review countdown clock reset for Claim ${claim.claimId}`);
        break;
      case 'triggerPaymentSystem':
        console.log(` > \x1b[36mSystem Action:\x1b[0m Bank wire transfer initiated in Payment Gateway for Claim ${claim.claimId}`);
        break;
      case 'notifyMemberWithPaymentReference':
        console.log(` > \x1b[36mNotification Sent:\x1b[0m Reference confirmation wired to member for Claim ${claim.claimId}`);
        break;
      case 'archiveClaim':
        console.log(` > \x1b[36mSystem Action:\x1b[0m Claim data and audit records permanently indexed into regulatory archives.`);
        break;
      default:
        console.log(` > Side effect executor completed successfully.`);
    }
  }
}
