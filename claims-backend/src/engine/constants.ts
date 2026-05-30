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

