import { configureStore } from '@reduxjs/toolkit';
import { platformTenantsReducer } from './platform-tenants.slice';

export const store = configureStore({
  reducer: {
    platformTenants: platformTenantsReducer,
  },
});
