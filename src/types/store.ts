import type { store } from '@/store';

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export interface AppProvidersProps {
  children: React.ReactNode;
}

export interface TenantTableSkeletonProps {
  rows?: number;
}
