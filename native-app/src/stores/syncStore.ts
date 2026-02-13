import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncFileRecord } from '../types';

type SyncStatus = 'idle' | 'scanning' | 'uploading' | 'complete' | 'error';

interface SyncState {
  folderUri: string | null;
  syncHistory: Record<string, SyncFileRecord>;
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  syncProgress: { current: number; total: number };
  autoSyncEnabled: boolean;
  errorMessage: string | null;

  setFolder: (uri: string) => void;
  resetFolder: () => void;
  setSyncStatus: (status: SyncStatus, errorMessage?: string) => void;
  setSyncProgress: (current: number, total: number) => void;
  markSynced: (filename: string, record: SyncFileRecord) => void;
  clearHistory: () => void;
  setAutoSync: (enabled: boolean) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      folderUri: null,
      syncHistory: {},
      lastSyncAt: null,
      syncStatus: 'idle',
      syncProgress: { current: 0, total: 0 },
      autoSyncEnabled: true,
      errorMessage: null,

      setFolder: (uri) => set({ folderUri: uri }),

      resetFolder: () =>
        set({ folderUri: null, syncHistory: {}, lastSyncAt: null }),

      setSyncStatus: (status, errorMessage) =>
        set({
          syncStatus: status,
          errorMessage: errorMessage ?? null,
          ...(status === 'complete' ? { lastSyncAt: new Date().toISOString() } : {}),
        }),

      setSyncProgress: (current, total) =>
        set({ syncProgress: { current, total } }),

      markSynced: (filename, record) =>
        set((state) => ({
          syncHistory: { ...state.syncHistory, [filename]: record },
        })),

      clearHistory: () => set({ syncHistory: {}, lastSyncAt: null }),

      setAutoSync: (enabled) => set({ autoSyncEnabled: enabled }),
    }),
    {
      name: 'invoice-sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        folderUri: state.folderUri,
        syncHistory: state.syncHistory,
        lastSyncAt: state.lastSyncAt,
        autoSyncEnabled: state.autoSyncEnabled,
      }),
    },
  ),
);
