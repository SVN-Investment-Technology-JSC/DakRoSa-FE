'use client';

import { Provider } from 'react-redux';
import { AuthProvider } from '@/providers/auth-provider';
import { store } from '@/store';
import type { AppProvidersProps } from '@/types/store';

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
