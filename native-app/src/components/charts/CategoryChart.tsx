import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { InvoiceStats } from '../../types';

interface Props {
  stats: InvoiceStats;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const BAR_HEIGHT = 24;
const BAR_GAP = 6;

const COLORS = [
  '#0078D4', '#2E7D32', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
  '#84CC16', '#0EA5E9', '#D946EF', '#FB923C', '#22C55E',
];

export default function CategoryChart({ stats }: Props) {
  const theme = useTheme();

  const chartData = useMemo(() => {
    const entries = Object.entries(stats.by_category)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10);

    if (entries.length === 0) return null;

    const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);

    return entries.map(([name, { total, count }], i) => ({
      name: name.length > 25 ? name.slice(0, 24) + '…' : name,
      total,
      count,
      width: (total / maxTotal) * (CHART_WIDTH - 16),
      color: COLORS[i % COLORS.length],
    }));
  }, [stats]);

  if (!chartData) return null;

  const canvasHeight = chartData.length * (BAR_HEIGHT + BAR_GAP) + 10;

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Top Categories by Spending
      </Text>

      {chartData.map((item, i) => (
        <View key={item.name} style={styles.barRow}>
          <Text variant="labelSmall" numberOfLines={1} style={styles.barLabel}>
            {item.name}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: Math.max(item.width, 4), backgroundColor: item.color },
              ]}
            />
          </View>
          <Text variant="labelSmall" style={[styles.barValue, { color: theme.colors.onSurfaceVariant }]}>
            {item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : item.total.toFixed(0)}
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
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  barLabel: {
    width: 100,
    textAlign: 'right',
    fontSize: 10,
  },
  barTrack: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 40,
    fontSize: 10,
  },
});
