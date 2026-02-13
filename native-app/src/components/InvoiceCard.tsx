import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Chip, useTheme } from 'react-native-paper';
import type { Invoice } from '../types';
import { formatDate, formatCurrency, formatOrderNo, formatPartnerName } from '../utils/format';

interface Props {
  invoice: Invoice;
  onPress: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  showUploader?: boolean;
}

function InvoiceCard({ invoice, onPress, onDelete, showUploader }: Props) {
  const theme = useTheme();
  const partnerName = formatPartnerName(invoice.delivery_partner);

  return (
    <Card style={styles.card} mode="elevated" onPress={() => onPress(invoice)}>
      <Card.Content style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={1}>
              {invoice.invoice_no ?? 'No Invoice #'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDate(invoice.date)}
            </Text>
          </View>
          <Text variant="titleMedium" style={[styles.amount, { color: theme.colors.primary }]}>
            {formatCurrency(invoice.items_total)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {partnerName !== '—' && (
            <Chip icon="truck-delivery" compact textStyle={styles.chipText}>
              {partnerName}
            </Chip>
          )}
          <Chip icon="package-variant" compact textStyle={styles.chipText}>
            {invoice.items?.length ?? invoice.items_count ?? 0} items
          </Chip>
          {invoice.order_no && (
            <Chip icon="receipt" compact textStyle={styles.chipText}>
              {formatOrderNo(invoice.order_no)}
            </Chip>
          )}
        </View>

        {showUploader && invoice.username && (
          <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
            Uploaded by: {invoice.username}
          </Text>
        )}
      </Card.Content>

      {onDelete && (
        <Card.Actions style={styles.actions}>
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={theme.colors.error}
            onPress={() => onDelete(invoice)}
          />
        </Card.Actions>
      )}
    </Card>
  );
}

export default memo(InvoiceCard);

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
  flex: { flex: 1, marginRight: 8 },
  amount: {
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
  actions: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
});
