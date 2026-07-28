import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { platformTenantsService } from '@/services/platform-tenants.service';
import type {
  CreatePlatformTenantInput,
  FetchPlatformTenantsInput,
  PermanentlyDeletePlatformTenantInput,
  PlatformTenant,
  PlatformTenantsRootState,
  PlatformTenantsState,
  UpdatePlatformTenantActionInput,
} from '@/types/platform-tenancy';

const TENANT_CACHE_TTL = 5 * 60 * 1000;

const initialState: PlatformTenantsState = {
  active: [],
  archived: [],
  activeStatus: 'idle',
  archivedStatus: 'idle',
  activeFetchedAt: null,
  archivedFetchedAt: null,
  activeError: null,
  archivedError: null,
};

function hasFreshCache(fetchedAt: number | null) {
  return fetchedAt !== null && Date.now() - fetchedAt < TENANT_CACHE_TTL;
}

export const fetchActiveTenants = createAsyncThunk<
  PlatformTenant[],
  FetchPlatformTenantsInput,
  { state: PlatformTenantsRootState }
>(
  'platformTenants/fetchActive',
  () => platformTenantsService.getActive(),
  {
    condition: ({ force = false }, { getState }) => {
      const state = getState().platformTenants;
      if (state.activeStatus === 'loading') return false;
      return (
        force ||
        state.activeStatus !== 'succeeded' ||
        !hasFreshCache(state.activeFetchedAt)
      );
    },
  },
);

export const fetchArchivedTenants = createAsyncThunk<
  PlatformTenant[],
  FetchPlatformTenantsInput,
  { state: PlatformTenantsRootState }
>(
  'platformTenants/fetchArchived',
  () => platformTenantsService.getArchived(),
  {
    condition: ({ force = false }, { getState }) => {
      const state = getState().platformTenants;
      if (state.archivedStatus === 'loading') return false;
      return (
        force ||
        state.archivedStatus !== 'succeeded' ||
        !hasFreshCache(state.archivedFetchedAt)
      );
    },
  },
);

export const createPlatformTenant = createAsyncThunk(
  'platformTenants/create',
  (input: CreatePlatformTenantInput) => platformTenantsService.create(input),
);

export const updatePlatformTenant = createAsyncThunk(
  'platformTenants/update',
  ({ id, input }: UpdatePlatformTenantActionInput) =>
    platformTenantsService.update(id, input),
);

export const archivePlatformTenant = createAsyncThunk(
  'platformTenants/archive',
  async (id: string) => {
    await platformTenantsService.archive(id);
    return id;
  },
);

export const restorePlatformTenant = createAsyncThunk(
  'platformTenants/restore',
  (id: string) => platformTenantsService.restore(id),
);

export const permanentlyDeletePlatformTenant = createAsyncThunk(
  'platformTenants/permanentlyDelete',
  async ({ id, confirmation }: PermanentlyDeletePlatformTenantInput) => {
    await platformTenantsService.permanentlyDelete(id, confirmation);
    return id;
  },
);

const platformTenantsSlice = createSlice({
  name: 'platformTenants',
  initialState,
  reducers: {
    tenantUpserted(state, action: PayloadAction<PlatformTenant>) {
      const tenant = action.payload;
      const activeIndex = state.active.findIndex((item) => item.id === tenant.id);
      const archivedIndex = state.archived.findIndex((item) => item.id === tenant.id);

      if (activeIndex >= 0) state.active[activeIndex] = tenant;
      else if (archivedIndex >= 0) state.archived[archivedIndex] = tenant;
      else state.active.unshift(tenant);
    },
    activeTenantCacheInvalidated(state) {
      state.activeFetchedAt = null;
    },
    archivedTenantCacheInvalidated(state) {
      state.archivedFetchedAt = null;
    },
    platformTenantCacheCleared() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveTenants.pending, (state) => {
        state.activeStatus = 'loading';
        state.activeError = null;
      })
      .addCase(fetchActiveTenants.fulfilled, (state, action) => {
        state.active = action.payload;
        state.activeStatus = 'succeeded';
        state.activeFetchedAt = Date.now();
      })
      .addCase(fetchActiveTenants.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.activeStatus = 'failed';
        state.activeError =
          action.error.message ?? 'Không thể tải danh sách doanh nghiệp.';
      })
      .addCase(fetchArchivedTenants.pending, (state) => {
        state.archivedStatus = 'loading';
        state.archivedError = null;
      })
      .addCase(fetchArchivedTenants.fulfilled, (state, action) => {
        state.archived = action.payload;
        state.archivedStatus = 'succeeded';
        state.archivedFetchedAt = Date.now();
      })
      .addCase(fetchArchivedTenants.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.archivedStatus = 'failed';
        state.archivedError =
          action.error.message ?? 'Không thể tải doanh nghiệp đã lưu trữ.';
      })
      .addCase(createPlatformTenant.fulfilled, (state, action) => {
        state.active = [
          action.payload,
          ...state.active.filter((tenant) => tenant.id !== action.payload.id),
        ];
        state.activeFetchedAt = Date.now();
      })
      .addCase(updatePlatformTenant.fulfilled, (state, action) => {
        state.active = state.active.map((tenant) =>
          tenant.id === action.payload.id ? action.payload : tenant,
        );
        state.activeFetchedAt = Date.now();
      })
      .addCase(archivePlatformTenant.fulfilled, (state, action) => {
        const tenant = state.active.find((item) => item.id === action.payload);
        state.active = state.active.filter((item) => item.id !== action.payload);
        if (tenant) {
          state.archived = [
            tenant,
            ...state.archived.filter((item) => item.id !== tenant.id),
          ];
        }
        state.activeFetchedAt = Date.now();
      })
      .addCase(restorePlatformTenant.fulfilled, (state, action) => {
        state.archived = state.archived.filter(
          (tenant) => tenant.id !== action.payload.id,
        );
        state.active = [
          action.payload,
          ...state.active.filter((tenant) => tenant.id !== action.payload.id),
        ];
        state.activeFetchedAt = Date.now();
        state.archivedFetchedAt = Date.now();
      })
      .addCase(permanentlyDeletePlatformTenant.fulfilled, (state, action) => {
        state.archived = state.archived.filter(
          (tenant) => tenant.id !== action.payload,
        );
        state.archivedFetchedAt = Date.now();
      });
  },
});

export const {
  activeTenantCacheInvalidated,
  archivedTenantCacheInvalidated,
  platformTenantCacheCleared,
  tenantUpserted,
} = platformTenantsSlice.actions;

export const platformTenantsReducer = platformTenantsSlice.reducer;
