import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { InvoiceStats } from '../../types';

interface Props {
  stats: InvoiceStats;
}

const COLORS = [
  '#0078D4', '#2E7D32', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

export default function TopItemsChart({ stats }: Props) {
  const theme = useTheme();

  const items = useMemo(() => {
    return Object.entries(stats.by_category)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .map(([name, { count }], i) => ({
        name: name.length > 30 ? name.slice(0, 29) + '…' : name,
        count,
        color: COLORS[i % COLORS.length],
      }));
  }, [stats]);

  if (items.length === 0) return null;

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Top Categories by Item Count
      </Text>

      {items.map((item) => (
        <View key={item.name} style={styles.row}>
          <Text variant="labelSmall" numberOfLines={1} style={styles.label}>
            {item.name}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text variant="labelSmall" style={{ width: 30, textAlign: 'right', color: theme.colors.onSurfaceVariant }}>
            {item.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  label: {
    width: 100,
    textAlign: 'right',
    fontSize: 10,
  },
  track: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
