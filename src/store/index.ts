import { configureStore } from '@reduxjs/toolkit';
import { platformTenantsReducer } from './platform-tenants.slice';
import { notificationsReducer } from './notifications.slice';

export const store = configureStore({
  reducer: {
    platformTenants: platformTenantsReducer,
    notifications: notificationsReducer,
  },
});
