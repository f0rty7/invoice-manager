import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import type { FlatItem } from '../types';
import { formatDate, formatCurrency } from '../utils/format';

interface Props {
  item: FlatItem;
}

function ItemCard({ item }: Props) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <Text variant="titleSmall" style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text variant="titleMedium" style={[styles.price, { color: theme.colors.primary }]}>
            {formatCurrency(item.price)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Chip icon="tag" compact textStyle={styles.chipText}>
            {item.category}
          </Chip>
          <Chip icon="counter" compact textStyle={styles.chipText}>
            Qty: {item.qty}
          </Chip>
          {item.unit_price != null && (
            <Chip icon="currency-inr" compact textStyle={styles.chipText}>
              @{formatCurrency(item.unit_price)}
            </Chip>
          )}
        </View>

        <View style={styles.invoiceRow}>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            Invoice: {item.invoice_no ?? '—'}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            {formatDate(item.date)}
          </Text>
          {item.delivery_partner && (
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              {item.delivery_partner}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

export default memo(ItemCard);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  content: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  desc: {
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipText: {
    fontSize: 11,
  },
  invoiceRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
});
