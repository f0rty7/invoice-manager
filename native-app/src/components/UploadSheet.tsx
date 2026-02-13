import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Button, Text, ProgressBar, List, useTheme, IconButton } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../stores/uiStore';
import { uploadPDFs } from '../api/invoices.api';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../utils/constants';

interface FileStatus {
  name: string;
  uri: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  progress: number;
}

export default function UploadSheet() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const isOpen = useUiStore((s) => s.isUploadSheetOpen);
  const closeSheet = useUiStore((s) => s.closeUploadSheet);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickFiles = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const newFiles: FileStatus[] = result.assets
        .filter((a) => {
          if ((a.size ?? 0) > MAX_FILE_SIZE_BYTES) return false;
          return true;
        })
        .map((a) => ({
          name: a.name,
          uri: a.uri,
          size: a.size ?? 0,
          status: 'pending' as const,
          progress: 0,
        }));

      setFiles((prev) => [...prev, ...newFiles]);
    } catch {
      // user cancelled
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);

    const pendingFiles = files.filter((f) => f.status === 'pending');

    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f,
      ),
    );

    try {
      const result = await uploadPDFs(
        pendingFiles.map((f) => ({ uri: f.uri, name: f.name, type: 'application/pdf' })),
        (pct) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.status === 'uploading' ? { ...f, progress: pct / 100 } : f,
            ),
          );
        },
      );

      const resultMap = new Map(
        (result.data?.results ?? []).map((r) => [r.filename, r]),
      );

      setFiles((prev) =>
        prev.map((f) => {
          if (f.status !== 'uploading') return f;
          const r = resultMap.get(f.name);
          if (r?.success) {
            return { ...f, status: 'success' as const, progress: 1, message: `${r.inserted} invoices` };
          }
          return { ...f, status: 'error' as const, progress: 1, message: r?.error ?? 'Failed' };
        }),
      );

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['filterOptions'] });
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, message: 'Upload failed' }
            : f,
        ),
      );
    } finally {
      setUploading(false);
    }
  }, [files, uploading, queryClient]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => setFiles([]), []);

  if (!isOpen) return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={['50%', '80%']}
      enablePanDownToClose
      onClose={closeSheet}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="titleLarge">Upload PDFs</Text>
          {files.length > 0 && (
            <Button compact onPress={clearAll}>Clear All</Button>
          )}
        </View>

        <Button
          mode="outlined"
          icon="file-pdf-box"
          onPress={pickFiles}
          style={styles.pickButton}
          disabled={uploading}
        >
          Pick PDF Files
        </Button>

        <Text variant="labelSmall" style={[styles.hint, { color: theme.colors.outline }]}>
          Max {MAX_FILE_SIZE_MB}MB per file
        </Text>

        {files.map((file, index) => (
          <List.Item
            key={`${file.name}-${index}`}
            title={file.name}
            description={
              file.status === 'uploading'
                ? `Uploading... ${Math.round(file.progress * 100)}%`
                : file.message ?? file.status
            }
            left={(props) => (
              <List.Icon
                {...props}
                icon={
                  file.status === 'success'
                    ? 'check-circle'
                    : file.status === 'error'
                      ? 'alert-circle'
                      : 'file-pdf-box'
                }
                color={
                  file.status === 'success'
                    ? theme.colors.tertiary
                    : file.status === 'error'
                      ? theme.colors.error
                      : theme.colors.primary
                }
              />
            )}
            right={() =>
              file.status === 'pending' ? (
                <IconButton icon="close" size={18} onPress={() => removeFile(index)} />
              ) : null
            }
          />
        ))}

        {files.some((f) => f.status === 'uploading') && (
          <ProgressBar
            progress={files.filter((f) => f.status === 'uploading')[0]?.progress ?? 0}
            style={styles.progress}
          />
        )}

        {files.some((f) => f.status === 'pending') && (
          <Button
            mode="contained"
            onPress={handleUpload}
            loading={uploading}
            disabled={uploading}
            style={styles.uploadButton}
            icon="upload"
          >
            Upload {files.filter((f) => f.status === 'pending').length} file(s)
          </Button>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButton: {
    borderRadius: 12,
  },
  hint: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  progress: {
    marginVertical: 8,
    borderRadius: 4,
  },
  uploadButton: {
    marginTop: 12,
    borderRadius: 12,
  },
});
