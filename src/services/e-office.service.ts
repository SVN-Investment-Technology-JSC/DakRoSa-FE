import type {
  CreateSubmissionInput,
  Reviewer,
  ReviewDecision,
  Submission,
  SubmissionFilters,
  SubmissionList,
  SubmissionSummary,
} from '@/types/e-office';
import { apiRequest } from './api-client';

export const eOfficeService = {
  getSummary: () => apiRequest<SubmissionSummary>('/e-office/summary'),
  getWorkItems: () => apiRequest<SubmissionList>('/e-office/work-items'),
  getSubmissions(filters: SubmissionFilters = {}) {
    const query = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 50),
    });
    if (filters.search?.trim()) query.set('search', filters.search.trim());
    if (filters.status) query.set('status', filters.status);
    return apiRequest<SubmissionList>(`/e-office/submissions?${query.toString()}`);
  },
  createSubmission: (input: CreateSubmissionInput) => apiRequest<Submission>('/e-office/submissions', { method: 'POST', body: JSON.stringify(input) }),
  getSubmission: (id: string) => apiRequest<Submission>(`/e-office/submissions/${id}`),
  getReviewers: () => apiRequest<Reviewer[]>('/e-office/reviewers'),
  submitForReview: (id: string, assigneeId: string, note: string) => apiRequest<void>(`/e-office/submissions/${id}/submit`, { method: 'POST', body: JSON.stringify({ assigneeId, note }) }),
  review: (id: string, decision: ReviewDecision, note: string) => apiRequest<void>(`/e-office/submissions/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
};
