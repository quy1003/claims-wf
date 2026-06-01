import { PreconditionOperator } from './constants';

export interface BasePrecondition {
  field?: string;
  operator: PreconditionOperator;
  value?: any;
  compareField?: string;
  conditions?: BasePrecondition[];
  errorMessage: string;
}

export interface TransitionConfig {
  from: string;
  to: string;
  authorizedRoles: string[];
  preconditions: BasePrecondition[];
  sideEffects: string[];
}

export interface WorkflowConfig {
  states: Record<string, string>;
  transitions: TransitionConfig[];
}

export class TriggeredBy {
  userId!: string;
  role!: string;
}

export interface AuditLog {
  id: string;
  claimId: string;
  timestamp: string;
  fromState: string | null;
  toState: string;
  triggeredBy: TriggeredBy;
  reason: string;
  context: Record<string, any>;
}

export interface Claim {
  claimId: string;
  currentState: string;
  cycleCount: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class CreateClaimDto {
  claimId?: string;
  metadata?: Record<string, any>;
}

export class TransitionClaimDto {
  role?: string;
  userId?: string;
  toState!: string;
  reason!: string;
  context?: Record<string, any>;
}

export interface TransitionResult {
  success: boolean;
  claim: Claim;
  auditLog: AuditLog;
  sideEffectsExecuted: string[];
}
