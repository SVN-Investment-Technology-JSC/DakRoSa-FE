import type { DashboardSummary } from '@/types/dashboard';
import { apiRequest } from './api-client';

export const dashboardService = {
  getSummary: () => apiRequest<DashboardSummary>('/dashboard/summary'),
};
