import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Card,
  Text,
  Button,
  Switch,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { useSyncStore } from '../stores/syncStore';
import { useInvoiceSync } from '../hooks/useInvoiceSync';
import SyncHistoryList from '../components/sync/SyncHistoryList';
import { timeAgo } from '../utils/format';

export default function SyncSettingsScreen() {
  const theme = useTheme();
  const { pickSyncFolder, triggerSync } = useInvoiceSync();

  const folderUri = useSyncStore((s) => s.folderUri);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const autoSyncEnabled = useSyncStore((s) => s.autoSyncEnabled);
  const setAutoSync = useSyncStore((s) => s.setAutoSync);
  const resetFolder = useSyncStore((s) => s.resetFolder);
  const clearHistory = useSyncStore((s) => s.clearHistory);
  const syncHistory = useSyncStore((s) => s.syncHistory);

  const syncedCount = Object.values(syncHistory).filter((r) => r.result === 'success').length;
  const errorCount = Object.values(syncHistory).filter((r) => r.result === 'error').length;
  const isSyncing = syncStatus === 'scanning' || syncStatus === 'uploading';

  const handlePickFolder = async () => {
    await pickSyncFolder();
  };

  const handleChangeFolder = () => {
    Alert.alert(
      'Change Sync Folder',
      'This will clear your sync history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            resetFolder();
            await pickSyncFolder();
          },
        },
      ],
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Sync History',
      'All files will be re-synced on next sync. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  const folderDisplayName = folderUri
    ? decodeURIComponent(folderUri.split('%2F').pop() ?? folderUri.split('/').pop() ?? 'Selected folder')
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Sync Folder Card */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Sync Folder
          </Text>

          {folderUri ? (
            <>
              <List.Item
                title={folderDisplayName}
                description="Invoice PDFs will be synced from this folder"
                left={(props) => <List.Icon {...props} icon="folder" />}
              />
              <View style={styles.buttonRow}>
                <Button mode="outlined" onPress={handleChangeFolder} compact>
                  Change Folder
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                Choose a folder on your device where you save invoice PDFs. New files will be
                automatically uploaded when you open the app.
              </Text>
              <Button mode="contained" onPress={handlePickFolder} icon="folder-plus">
                Select Sync Folder
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Sync Controls */}
      {folderUri && (
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Sync Controls
            </Text>

            <List.Item
              title="Auto-sync on open"
              description="Sync automatically when you open the app"
              right={() => (
                <Switch value={autoSyncEnabled} onValueChange={setAutoSync} />
              )}
            />

            <Divider />

            <View style={styles.syncInfo}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Last sync: {lastSyncAt ? timeAgo(lastSyncAt) : 'Never'}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {syncedCount} synced{errorCount > 0 ? ` / ${errorCount} errors` : ''}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={triggerSync}
                loading={isSyncing}
                disabled={isSyncing}
                icon="sync"
              >
                Sync Now
              </Button>
              <Button
                mode="outlined"
                onPress={handleClearHistory}
                disabled={Object.keys(syncHistory).length === 0}
              >
                Clear History
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Sync History */}
      {Object.keys(syncHistory).length > 0 && (
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Sync History
            </Text>
            <SyncHistoryList />
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
