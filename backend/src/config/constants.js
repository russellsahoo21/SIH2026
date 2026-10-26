// Roles and bureaus
export const ROLES = ['STUDENT', 'COLLEGE', 'OFFICER', 'HEAD', 'COORDINATOR', 'MANAGEMENT', 'ADMIN'];

export const BUREAUS = ['RB', 'PGRC', 'RO', 'CELL'];

export const CATEGORIES = [
  'FEES',
  'INTAKE',
  'FACULTY',
  'INFRASTRUCTURE',
  'RAGGING',
  'NORM_VIOLATION',
  'OTHER'
];

export const SOURCE_CHANNELS = [
  'EMAIL',
  'LETTER',
  'CPGRAMS',
  'MINISTRY',
  'VIP',
  'COURT',
  'RTI',
  'PARLIAMENT',
  'OTHER'
];

export const CASE_STATUSES = [
  'NEW',
  'UNDER_PROCESS',
  'PENDING',
  'TRANSFERRED',
  'ESCALATED',
  'DISPOSED'
];

export const OPEN_STATUSES = CASE_STATUSES.filter(s => s !== 'DISPOSED');

// Allowed status transitions
export const TRANSITIONS = {
  NEW:           ['UNDER_PROCESS', 'TRANSFERRED'],
  UNDER_PROCESS: ['PENDING', 'ESCALATED', 'DISPOSED', 'TRANSFERRED'],
  PENDING:       ['UNDER_PROCESS', 'ESCALATED', 'DISPOSED'],
  ESCALATED:     ['UNDER_PROCESS', 'DISPOSED'],
  TRANSFERRED:   ['UNDER_PROCESS'], // receiving bureau picks it up
  DISPOSED:      ['UNDER_PROCESS']  // reopen, HEAD only
};

// Transitions that require HEAD or ADMIN role
export const HEAD_ONLY_TRANSITIONS = ['DISPOSED', 'REOPEN'];

// Action types
export const ACTION_TYPES = [
  'REGISTERED',
  'CATEGORY_CONFIRMED',
  'STATUS_CHANGED',
  'REMARK_ADDED',
  'DOCUMENT_ADDED',
  'TRANSFERRED',
  'ASSIGNED',
  'ESCALATED',
  'DISPOSED',
  'REOPENED',
  'OVERLAP_DETECTED',
  'OVERLAP_LINKED',
  'OVERLAP_NOT_RELATED',
  'LEAD_BUREAU_SET'
];
