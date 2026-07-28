export interface DashboardSummary {
  users: number;
  activeUsers: number;
  roles: number;
  eventsToday: number;
  collector: {
    status: string;
    label: string;
  };
}
