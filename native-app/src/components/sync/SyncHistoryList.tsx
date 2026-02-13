import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { useSyncStore } from '../../stores/syncStore';
import type { SyncFileRecord } from '../../types';
import { timeAgo } from '../../utils/format';

export default function SyncHistoryList() {
  const theme = useTheme();
  const syncHistory = useSyncStore((s) => s.syncHistory);

  const entries = Object.values(syncHistory)
    .sort((a, b) => new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime());

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No files synced yet
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: SyncFileRecord }) => (
    <List.Item
      title={item.filename}
      description={
        item.result === 'success'
          ? `${item.invoiceCount ?? 0} invoices - ${timeAgo(item.syncedAt)}`
          : `Error: ${item.errorMessage ?? 'Failed'} - ${timeAgo(item.syncedAt)}`
      }
      left={(props) => (
        <List.Icon
          {...props}
          icon={item.result === 'success' ? 'check-circle' : 'alert-circle'}
          color={item.result === 'success' ? theme.colors.tertiary : theme.colors.error}
        />
      )}
    />
  );

  return (
    <FlatList
      data={entries}
      renderItem={renderItem}
      keyExtractor={(item) => item.filename}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
});
