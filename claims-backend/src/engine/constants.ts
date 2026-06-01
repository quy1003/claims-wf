export enum ClaimState {
  SUBMITTED = 'SUBMITTED',
  DOCUMENTS_VERIFIED = 'DOCUMENTS_VERIFIED',
  UNDER_ASSESSMENT = 'UNDER_ASSESSMENT',
  PENDING_INFO = 'PENDING_INFO',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  CLOSED = 'CLOSED',
}

export enum UserRole {
  SYSTEM = 'system',
  DOCUMENT_CLERK = 'document_clerk',
  TEAM_LEAD = 'team_lead',
  ASSESSOR = 'assessor',
  FINANCE = 'finance',
}

export const SYSTEM_USER = {
  userId: 'system_creator',
  role: UserRole.SYSTEM,
};

export enum PreconditionOperator {
  EQUALS = 'equals',
  NOT_EMPTY = 'notEmpty',
  LESS_THAN_OR_EQUAL_FIELD = 'lessThanOrEqualField',
  OR = 'or',
}

export const MAX_INFO_REQUEST_CYCLES = 3;

export enum WorkflowSideEffect {
  NOTIFY_ASSESSOR_TEAM = 'notifyAssessorTeam',
  LOG_ASSESSMENT_START_TIME = 'logAssessmentStartTime',
  NOTIFY_MEMBER_OF_APPROVAL = 'notifyMemberOfApproval',
  CREATE_PAYMENT_REQUEST = 'createPaymentRequest',
  NOTIFY_MEMBER_OF_REJECTION_WITH_APPEAL_INSTRUCTIONS = 'notifyMemberOfRejectionWithAppealInstructions',
  NOTIFY_MEMBER_OF_MISSING_INFO_REQUEST = 'notifyMemberOfMissingInfoRequest',
  RESET_ASSESSMENT_TIMER = 'resetAssessmentTimer',
  TRIGGER_PAYMENT_SYSTEM = 'triggerPaymentSystem',
  NOTIFY_MEMBER_WITH_PAYMENT_REFERENCE = 'notifyMemberWithPaymentReference',
  ARCHIVE_CLAIM = 'archiveClaim',
}
