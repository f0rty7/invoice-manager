import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatCurrency } from '../../utils/format';

interface PartnerData {
  name: string;
  total: number;
  count: number;
}

interface Props {
  data: PartnerData[];
}

const COLORS = ['#0078D4', '#2E7D32', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

export default function PartnerSpendingChart({ data }: Props) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="bodySmall">No partner data</Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => b.total - a.total).slice(0, 7);
  const maxTotal = Math.max(...sorted.map((d) => d.total), 1);

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Delivery Partner Spending
      </Text>

      {sorted.map((partner, i) => (
        <View key={partner.name} style={styles.row}>
          <Text variant="labelSmall" numberOfLines={1} style={styles.label}>
            {partner.name}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(partner.total / maxTotal) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                },
              ]}
            />
          </View>
          <Text variant="labelSmall" style={[styles.value, { color: theme.colors.onSurfaceVariant }]}>
            {formatCurrency(partner.total)}
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
    marginBottom: 8,
    gap: 6,
  },
  label: {
    width: 80,
    textAlign: 'right',
    fontSize: 10,
  },
  track: {
    flex: 1,
    height: 22,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 60,
    fontSize: 10,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
});
