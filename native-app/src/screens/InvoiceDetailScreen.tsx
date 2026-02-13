import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Chip, Divider, ActivityIndicator, useTheme, DataTable } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { InvoiceDetailScreenProps } from '../navigation/types';
import { getInvoiceById } from '../api/invoices.api';
import { formatDate, formatCurrency, formatOrderNo, formatPartnerName } from '../utils/format';

export default function InvoiceDetailScreen({ route }: InvoiceDetailScreenProps) {
  const theme = useTheme();
  const { invoiceId } = route.params;

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const res = await getInvoiceById(invoiceId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Not found');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !invoice) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          Invoice not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Invoice Info Card */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
            {invoice.invoice_no ?? 'Invoice'}
          </Text>

          <View style={styles.infoGrid}>
            <InfoRow label="Date" value={formatDate(invoice.date)} />
            <InfoRow label="Order No" value={formatOrderNo(invoice.order_no)} />
            <InfoRow label="Partner" value={formatPartnerName(invoice.delivery_partner)} />
            <InfoRow label="Total" value={formatCurrency(invoice.items_total)} highlight />
            <InfoRow label="Items" value={String(invoice.items?.length ?? 0)} />
          </View>

          {invoice.username && (
            <Chip icon="account" compact style={styles.uploaderChip}>
              Uploaded by: {invoice.username}
            </Chip>
          )}
        </Card.Content>
      </Card>

      {/* Items Table */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.itemsTitle}>
            Invoice Items
          </Text>

          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={styles.colSr}>#</DataTable.Title>
              <DataTable.Title style={styles.colDesc}>Item</DataTable.Title>
              <DataTable.Title numeric style={styles.colQty}>Qty</DataTable.Title>
              <DataTable.Title numeric style={styles.colPrice}>Price</DataTable.Title>
            </DataTable.Header>

            {invoice.items.map((item, index) => (
              <DataTable.Row key={index}>
                <DataTable.Cell style={styles.colSr}>
                  <Text variant="bodySmall">{item.sr}</Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.colDesc}>
                  <View>
                    <Text variant="bodySmall" numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      {item.category}
                    </Text>
                  </View>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.colQty}>
                  <Text variant="bodySmall">{item.qty}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.colPrice}>
                  <Text variant="bodySmall">{formatCurrency(item.price)}</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant="titleSmall">Total</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatCurrency(invoice.items_total)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const theme = useTheme();
  return (
    <View style={infoStyles.row}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={highlight ? { color: theme.colors.primary, fontWeight: '700' } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    gap: 8,
  },
  infoGrid: {
    marginTop: 8,
  },
  uploaderChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itemsTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  colSr: { flex: 0.3 },
  colDesc: { flex: 2 },
  colQty: { flex: 0.5 },
  colPrice: { flex: 0.8 },
  divider: {
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
