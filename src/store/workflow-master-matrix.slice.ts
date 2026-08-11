import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { workflowApi } from '@/lib/api-workflow';
import type {
  WorkflowGlobalMasterBoard,
  WorkflowRoleMapping,
  WorkflowRoleMappingBoard,
} from '@/types/workflow';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface WorkflowMasterMatrixState {
  definitions: WorkflowGlobalMasterBoard['definitions'];
  persistedMappings: WorkflowRoleMapping[];
  draftMappings: WorkflowRoleMapping[];
  dirtyDefinitionIds: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  saving: boolean;
  fetchedAt: number | null;
  error: string | null;
}

interface WorkflowMasterMatrixRootState {
  workflowMasterMatrix: WorkflowMasterMatrixState;
}

const initialState: WorkflowMasterMatrixState = {
  definitions: [],
  persistedMappings: [],
  draftMappings: [],
  dirtyDefinitionIds: [],
  status: 'idle',
  saving: false,
  fetchedAt: null,
  error: null,
};

function toApiMapping(mapping: WorkflowRoleMapping) {
  return {
    variableKey: mapping.variableKey.trim(),
    targetType: mapping.targetType,
    targetId: mapping.targetId,
  };
}

export const fetchWorkflowMasterMatrix = createAsyncThunk<
  WorkflowGlobalMasterBoard,
  { force?: boolean } | undefined,
  { state: WorkflowMasterMatrixRootState }
>(
  'workflowMasterMatrix/fetch',
  () => workflowApi.getGlobalMasterBoard(),
  {
    condition: ({ force = false } = {}, { getState }) => {
      const state = getState().workflowMasterMatrix;
      if (state.status === 'loading') return false;
      return (
        force ||
        state.status !== 'succeeded' ||
        state.fetchedAt === null ||
        Date.now() - state.fetchedAt >= CACHE_TTL_MS
      );
    },
  },
);

export const saveWorkflowMasterMatrix = createAsyncThunk<
  WorkflowRoleMappingBoard[],
  void,
  { state: WorkflowMasterMatrixRootState }
>('workflowMasterMatrix/save', async (_, { getState }) => {
  const state = getState().workflowMasterMatrix;
  return Promise.all(
    state.dirtyDefinitionIds.map((definitionId) =>
      workflowApi.saveMasterBoard(
        definitionId,
        state.draftMappings
          .filter((mapping) => mapping.definitionId === definitionId)
          .map(toApiMapping),
      ),
    ),
  );
});

const workflowMasterMatrixSlice = createSlice({
  name: 'workflowMasterMatrix',
  initialState,
  reducers: {
    masterMatrixRoleVariablesChanged(
      state,
      action: PayloadAction<{
        definitionId: string;
        roleId: string;
        variableKeys: string[];
      }>,
    ) {
      const { definitionId, roleId, variableKeys } = action.payload;
      state.draftMappings = [
        ...state.draftMappings.filter(
          (mapping) =>
            !(
              mapping.definitionId === definitionId &&
              mapping.targetType === 'ROLE' &&
              mapping.targetId === roleId
            ),
        ),
        ...variableKeys.map((variableKey) => ({
          definitionId,
          variableKey,
          targetType: 'ROLE' as const,
          targetId: roleId,
        })),
      ];
      if (!state.dirtyDefinitionIds.includes(definitionId)) {
        state.dirtyDefinitionIds.push(definitionId);
      }
    },
    masterMatrixDraftReset(state) {
      state.draftMappings = state.persistedMappings;
      state.dirtyDefinitionIds = [];
    },
    masterMatrixCacheInvalidated(state) {
      state.fetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkflowMasterMatrix.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWorkflowMasterMatrix.fulfilled, (state, action) => {
        state.definitions = action.payload.definitions;
        state.persistedMappings = action.payload.mappings;
        state.draftMappings = action.payload.mappings;
        state.dirtyDefinitionIds = [];
        state.status = 'succeeded';
        state.fetchedAt = Date.now();
      })
      .addCase(fetchWorkflowMasterMatrix.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.status = 'failed';
        state.error = action.error.message ?? 'Không thể tải Ma trận Master.';
      })
      .addCase(saveWorkflowMasterMatrix.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveWorkflowMasterMatrix.fulfilled, (state, action) => {
        const changedDefinitionIds = new Set(state.dirtyDefinitionIds);
        const savedMappings = action.payload.flatMap((board) => board.mappings);
        state.persistedMappings = [
          ...state.persistedMappings.filter(
            (mapping) => !changedDefinitionIds.has(mapping.definitionId ?? ''),
          ),
          ...savedMappings,
        ];
        state.draftMappings = state.persistedMappings;
        state.dirtyDefinitionIds = [];
        state.saving = false;
        state.fetchedAt = Date.now();
      })
      .addCase(saveWorkflowMasterMatrix.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? 'Không thể lưu Ma trận Master.';
      });
  },
});

export const {
  masterMatrixCacheInvalidated,
  masterMatrixDraftReset,
  masterMatrixRoleVariablesChanged,
} = workflowMasterMatrixSlice.actions;
export const workflowMasterMatrixReducer = workflowMasterMatrixSlice.reducer;
