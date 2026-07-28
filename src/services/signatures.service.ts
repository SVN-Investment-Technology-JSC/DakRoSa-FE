import type { SignatureRequest } from '@/types/e-office';
import { apiRequest } from './api-client';

export const signaturesService = {
  getRequests: () => apiRequest<SignatureRequest[]>('/signatures'),
  createRequest: (submissionId: string) => apiRequest<void>('/signatures', { method: 'POST', body: JSON.stringify({ submissionId }) }),
};
