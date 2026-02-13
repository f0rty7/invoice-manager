import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useStats } from '../hooks/useStats';
import { useInvoiceAggregate } from '../hooks/useInvoices';
import { formatCurrency, formatNumber } from '../utils/format';

export default function StatsCards() {
  const theme = useTheme();
  const { data: stats } = useStats();
  const { data: aggregate } = useInvoiceAggregate();

  if (!stats && !aggregate) return null;

  const cards = [
    {
      title: 'Total Invoices',
      value: formatNumber(aggregate?.total_count ?? stats?.total_invoices ?? 0),
      icon: 'file-document-multiple',
      color: theme.colors.primary,
    },
    {
      title: 'Total Amount',
      value: formatCurrency(aggregate?.total_amount ?? stats?.total_amount ?? 0),
      icon: 'currency-inr',
      color: theme.colors.tertiary,
    },
    {
      title: 'Categories',
      value: stats ? String(Object.keys(stats.by_category).length) : '—',
      icon: 'tag-multiple',
      color: '#F59E0B',
    },
    {
      title: 'Months',
      value: stats ? String(Object.keys(stats.by_month).length) : '—',
      icon: 'calendar-range',
      color: '#8B5CF6',
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <Card key={card.title} style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {card.title}
            </Text>
            <Text variant="titleMedium" style={{ color: card.color, fontWeight: '700' }} numberOfLines={1}>
              {card.value}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: '45%',
  },
  cardContent: {
    gap: 4,
    paddingVertical: 10,
  },
});
