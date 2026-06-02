// ─── Claim & Workflow Types ────────────────────────────────────────────────

export type ClaimState =
  | 'SUBMITTED'
  | 'DOCUMENTS_VERIFIED'
  | 'UNDER_ASSESSMENT'
  | 'PENDING_INFO'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_INITIATED'
  | 'CLOSED';

export type UserRole =
  | 'document_clerk'
  | 'team_lead'
  | 'assessor'
  | 'finance'
  | 'system';

export interface Claim {
  claimId: string;
  currentState: ClaimState;
  cycleCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  availableTransitions?: AvailableTransition[];
}

export interface AvailableTransition {
  to: ClaimState;
  authorizedRoles: UserRole[];
  preconditions: Precondition[];
}

export interface Precondition {
  field?: string;
  operator: string;
  value?: unknown;
  compareField?: string;
  conditions?: Precondition[];
  errorMessage: string;
}

export interface AuditLog {
  id: string;
  claimId: string;
  timestamp: string;
  fromState: ClaimState | null;
  toState: ClaimState;
  triggeredByUserId: string;
  triggeredByRole: UserRole;
  reason: string;
  context: Record<string, unknown>;
}

// ─── Request / Response Types ──────────────────────────────────────────────

export interface CreateClaimRequest {
  claimId?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionRequest {
  toState: ClaimState;
  reason: string;
  role?: UserRole;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  claim: Claim;
  auditLog: AuditLog;
  sideEffectsExecuted: string[];
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  timestamp: string;
}

// ─── Scenario Types ────────────────────────────────────────────────────────

export interface ScenarioStep {
  step: number;
  description: string;
  from: string;
  to: string;
  role: string;
  success: boolean;
  error?: string;
}

export interface ScenarioReport {
  scenarioNumber: number;
  name: string;
  description: string;
  success: boolean;
  claimId: string;
  finalState: ClaimState;
  cycleCount: number;
  stepsExecuted: ScenarioStep[];
  auditTrail: AuditLog[];
}

// ─── UI State ─────────────────────────────────────────────────────────────

export interface WorkflowStateConfig {
  id: ClaimState;
  label: string;
  description: string;
  color: string;
  textColor: string;
  x: number;
  y: number;
}

export const WORKFLOW_STATES: WorkflowStateConfig[] = [
  { id: 'SUBMITTED',          label: 'Submitted',          description: 'Claim received, awaiting document verification', color: '#4f46e5', textColor: '#ffffff', x: 100, y: 200 },
  { id: 'DOCUMENTS_VERIFIED', label: 'Docs Verified',      description: 'All required documents confirmed present and valid', color: '#0891b2', textColor: '#ffffff', x: 300, y: 100 },
  { id: 'UNDER_ASSESSMENT',   label: 'Under Assessment',   description: 'Assessor is reviewing the claim', color: '#7c3aed', textColor: '#ffffff', x: 520, y: 200 },
  { id: 'PENDING_INFO',       label: 'Pending Info',       description: 'Additional information requested from member', color: '#d97706', textColor: '#ffffff', x: 300, y: 300 },
  { id: 'APPROVED',           label: 'Approved',           description: 'Claim approved for payment', color: '#059669', textColor: '#ffffff', x: 740, y: 100 },
  { id: 'REJECTED',           label: 'Rejected',           description: 'Claim denied', color: '#dc2626', textColor: '#ffffff', x: 740, y: 300 },
  { id: 'PAYMENT_INITIATED',  label: 'Payment Initiated',  description: 'Payment processing started', color: '#0d9488', textColor: '#ffffff', x: 920, y: 100 },
  { id: 'CLOSED',             label: 'Closed',             description: 'Claim lifecycle complete', color: '#374151', textColor: '#9ca3af', x: 1100, y: 200 },
];

export const ROLE_COLORS: Record<UserRole, string> = {
  document_clerk: '#0891b2',
  team_lead: '#7c3aed',
  assessor: '#d97706',
  finance: '#059669',
  system: '#374151',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  document_clerk: 'Document Clerk',
  team_lead: 'Team Lead',
  assessor: 'Assessor',
  finance: 'Finance',
  system: 'System',
};

export const SCENARIOS_META = [
  { index: 1, name: 'Happy Path', icon: '✅', description: 'Full lifecycle: SUBMITTED → CLOSED via approval & payment', tags: ['success', 'payment'] },
  { index: 2, name: 'Rejection Path', icon: '❌', description: 'Claim denied then archived: SUBMITTED → REJECTED → CLOSED', tags: ['rejection', 'archive'] },
  { index: 3, name: 'Info Loop (3 cycles)', icon: '🔄', description: 'Three PENDING_INFO cycles then approved successfully', tags: ['cycles', 'success'] },
  { index: 4, name: 'Invalid Transition', icon: '🚫', description: 'Attempt illegal jump SUBMITTED → APPROVED (must block)', tags: ['guard', 'error'] },
  { index: 5, name: 'Unauthorized Role', icon: '🔒', description: 'Wrong role attempts state change (must be rejected)', tags: ['rbac', 'error'] },
  { index: 6, name: 'Cycle Limit Exceeded', icon: '⛔', description: '4th info request blocked — escalation triggered', tags: ['cycles', 'guard'] },
];
