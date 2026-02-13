import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

// Lazy-load SAF / legacy file-system only on native (they use import.meta which breaks web)
function getSAF() {
  if (Platform.OS === 'web') return null;
  return require('expo-file-system/legacy').StorageAccessFramework;
}
function getLegacyFS() {
  if (Platform.OS === 'web') return null;
  return require('expo-file-system/legacy');
}
import { useSyncStore } from '../stores/syncStore';
import { uploadPDFs } from '../api/invoices.api';
import { MIN_SYNC_INTERVAL_MS, MAX_FILE_SIZE_BYTES } from '../utils/constants';
import type { SyncFileRecord } from '../types';

/**
 * Hook that provides invoice folder sync functionality.
 * - pickSyncFolder: prompt user to choose a directory via SAF
 * - triggerSync: scan folder -> diff -> upload new PDFs
 */
export function useInvoiceSync() {
  const queryClient = useQueryClient();
  const lastSyncRef = useRef(0);

  const folderUri = useSyncStore((s) => s.folderUri);
  const syncHistory = useSyncStore((s) => s.syncHistory);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const autoSyncEnabled = useSyncStore((s) => s.autoSyncEnabled);
  const setFolder = useSyncStore((s) => s.setFolder);
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus);
  const setSyncProgress = useSyncStore((s) => s.setSyncProgress);
  const markSynced = useSyncStore((s) => s.markSynced);

  // -- Pick a folder using SAF ------------------------------------------------
  const pickSyncFolder = useCallback(async () => {
    const SAF = getSAF();
    if (!SAF) return false;
    try {
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        setFolder(permissions.directoryUri);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setFolder]);

  // -- Scan the configured folder for PDF files -------------------------------
  const scanFolder = useCallback(async (): Promise<string[]> => {
    if (!folderUri) return [];
    const SAF = getSAF();
    if (!SAF) return [];
    try {
      const files = await SAF.readDirectoryAsync(folderUri);
      // SAF returns content:// URIs - filter by .pdf extension in the URI
      return files.filter((f: string) => f.toLowerCase().includes('.pdf'));
    } catch {
      return [];
    }
  }, [folderUri]);

  // -- Main sync: scan + diff + upload ----------------------------------------
  const triggerSync = useCallback(async () => {
    if (!folderUri) return;
    if (syncStatus === 'scanning' || syncStatus === 'uploading') return;

    // Debounce: skip if last sync was less than MIN_SYNC_INTERVAL_MS ago
    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;
    lastSyncRef.current = now;

    try {
      setSyncStatus('scanning');

      const allFiles = await scanFolder();
      // Determine which files are new (not in syncHistory or previously errored)
      const currentHistory = useSyncStore.getState().syncHistory;
      const newFiles = allFiles.filter((uri) => {
        const filename = decodeURIComponent(uri.split('/').pop() ?? uri);
        const record = currentHistory[filename];
        return !record || record.result === 'error';
      });

      if (newFiles.length === 0) {
        setSyncStatus('complete');
        return;
      }

      setSyncStatus('uploading');
      setSyncProgress(0, newFiles.length);

      for (let i = 0; i < newFiles.length; i++) {
        const fileUri = newFiles[i];
        const filename = decodeURIComponent(fileUri.split('/').pop() ?? fileUri);

        try {
          // Read file info for size check
          const legacyFS = getLegacyFS();
          const info = legacyFS
            ? await legacyFS.getInfoAsync(fileUri)
            : { exists: true };
          if (info.exists && 'size' in info && ((info as { size?: number }).size ?? 0) > MAX_FILE_SIZE_BYTES) {
            markSynced(filename, {
              filename,
              syncedAt: new Date().toISOString(),
              size: (info as { size: number }).size,
              result: 'error',
              errorMessage: 'File exceeds 10MB limit',
            });
            setSyncProgress(i + 1, newFiles.length);
            continue;
          }

          const result = await uploadPDFs([
            { uri: fileUri, name: filename, type: 'application/pdf' },
          ]);

          const fileResult = result.data?.results?.[0];
          const record: SyncFileRecord = {
            filename,
            syncedAt: new Date().toISOString(),
            size: info.exists && 'size' in info ? ((info as { size?: number }).size ?? 0) : 0,
            result: fileResult?.success ? 'success' : 'error',
            errorMessage: fileResult?.error,
            invoiceCount: fileResult?.inserted,
          };
          markSynced(filename, record);
        } catch (err) {
          markSynced(filename, {
            filename,
            syncedAt: new Date().toISOString(),
            size: 0,
            result: 'error',
            errorMessage: err instanceof Error ? err.message : 'Upload failed',
          });
        }

        setSyncProgress(i + 1, newFiles.length);
      }

      setSyncStatus('complete');
      // Invalidate data queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (err) {
      setSyncStatus('error', err instanceof Error ? err.message : 'Sync failed');
    }
  }, [folderUri, syncStatus, scanFolder, setSyncStatus, setSyncProgress, markSynced, queryClient]);

  // -- Auto-sync on app foreground (call from AppState listener) --------------
  const autoSync = useCallback(async () => {
    if (autoSyncEnabled && folderUri) {
      await triggerSync();
    }
  }, [autoSyncEnabled, folderUri, triggerSync]);

  return {
    pickSyncFolder,
    triggerSync,
    autoSync,
    scanFolder,
  };
}
