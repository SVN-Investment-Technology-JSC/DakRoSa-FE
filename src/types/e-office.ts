export type SubmissionStatus =
  | 'draft'
  | 'in_review'
  | 'returned'
  | 'approved'
  | 'cancelled';

export type SubmissionPriority = 'normal' | 'high' | 'urgent';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
}

export interface SubmissionAction {
  id: string;
  action: string;
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus;
  note: string | null;
  actor: UserSummary;
  createdAt: string;
}

export interface Submission {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  documentType: string;
  priority: SubmissionPriority;
  status: SubmissionStatus;
  workflowKey: string;
  workflowVersion: number;
  currentStep: string;
  requesterId: string;
  requester: UserSummary;
  currentAssigneeId: string | null;
  currentAssignee: UserSummary | null;
  dueAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  metadata: Record<string, unknown>;
  actions?: SubmissionAction[];
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionList {
  items: Submission[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmissionSummary {
  draft: number;
  inReview: number;
  returned: number;
  approved: number;
  cancelled: number;
}

export interface Reviewer {
  id: string;
  displayName: string;
  username: string;
}

export type SignatureStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SignatureRequest {
  id: string;
  submissionId: string;
  submission: Submission;
  requestedBy: string;
  requester: UserSummary;
  provider: string;
  signingMode: string;
  status: SignatureStatus;
  externalReference: string | null;
  completedAt: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
