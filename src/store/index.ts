import { configureStore } from '@reduxjs/toolkit';
import { platformTenantsReducer } from './platform-tenants.slice';
import { notificationsReducer } from './notifications.slice';
import { workflowMasterMatrixReducer } from './workflow-master-matrix.slice';

export const store = configureStore({
  reducer: {
    platformTenants: platformTenantsReducer,
    notifications: notificationsReducer,
    workflowMasterMatrix: workflowMasterMatrixReducer,
  },
});
