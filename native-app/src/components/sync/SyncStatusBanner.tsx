import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ProgressBar, IconButton, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSyncStore } from '../../stores/syncStore';
import type { AppStackParamList } from '../../navigation/types';
import { timeAgo } from '../../utils/format';

export default function SyncStatusBanner() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const syncProgress = useSyncStore((s) => s.syncProgress);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const folderUri = useSyncStore((s) => s.folderUri);
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus);

  // Don't show if no folder configured and idle
  if (!folderUri && syncStatus === 'idle') return null;
  if (syncStatus === 'idle' && !lastSyncAt) return null;

  const getStatusContent = () => {
    switch (syncStatus) {
      case 'scanning':
        return { text: 'Scanning folder for new invoices...', icon: 'folder-search', showProgress: false };
      case 'uploading':
        return {
          text: `Uploading ${syncProgress.current} of ${syncProgress.total} invoices...`,
          icon: 'cloud-upload',
          showProgress: true,
        };
      case 'complete':
        return { text: `Sync complete${lastSyncAt ? ` (${timeAgo(lastSyncAt)})` : ''}`, icon: 'check-circle', showProgress: false };
      case 'error':
        return { text: 'Sync error - tap for details', icon: 'alert-circle', showProgress: false };
      case 'idle':
        return { text: `Last sync: ${timeAgo(lastSyncAt)}`, icon: 'sync', showProgress: false };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  const bgColor =
    syncStatus === 'error'
      ? theme.colors.errorContainer
      : syncStatus === 'complete'
        ? theme.colors.tertiaryContainer
        : theme.colors.primaryContainer;

  const textColor =
    syncStatus === 'error'
      ? theme.colors.onErrorContainer
      : syncStatus === 'complete'
        ? theme.colors.onTertiaryContainer
        : theme.colors.onPrimaryContainer;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('SyncSettings')}
      activeOpacity={0.7}
    >
      <View style={[styles.banner, { backgroundColor: bgColor }]}>
        <View style={styles.row}>
          <IconButton icon={content.icon} size={18} iconColor={textColor} style={styles.icon} />
          <Text variant="labelMedium" style={[styles.text, { color: textColor }]}>
            {content.text}
          </Text>
          {syncStatus === 'complete' && (
            <IconButton
              icon="close"
              size={16}
              iconColor={textColor}
              onPress={() => setSyncStatus('idle')}
              style={styles.dismiss}
            />
          )}
        </View>
        {content.showProgress && syncProgress.total > 0 && (
          <ProgressBar
            progress={syncProgress.current / syncProgress.total}
            color={textColor}
            style={styles.progress}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  icon: {
    margin: 0,
  },
  text: {
    flex: 1,
  },
  dismiss: {
    margin: 0,
  },
  progress: {
    height: 3,
    borderRadius: 2,
  },
});
