import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { notificationsApi } from '@/lib/api-notifications';
import type { AppNotification } from '@/types/notification';

interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  (unreadOnly: boolean = false) => notificationsApi.getInbox(unreadOnly),
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  (id: string) => notificationsApi.markRead(id),
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  () => notificationsApi.markAllRead(),
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationsCleared: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
        state.status = 'succeeded';
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Không thể tải thông báo.';
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0 && !state.items[index].readAt) {
          state.items[index] = action.payload;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const readAt = new Date().toISOString();
        state.items = state.items.map((item) => ({ ...item, readAt: item.readAt ?? readAt }));
        state.unreadCount = 0;
      });
  },
});

export const { notificationsCleared } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
