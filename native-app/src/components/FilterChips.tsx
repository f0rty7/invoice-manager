import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { useInvoiceFilterStore } from '../stores/invoiceFilterStore';
import { useItemFilterStore } from '../stores/itemFilterStore';
import type { InvoiceFilters } from '../types';

interface Props {
  target: 'invoices' | 'items';
}

export default function FilterChips({ target }: Props) {
  const theme = useTheme();
  const invoiceFilters = useInvoiceFilterStore((s) => s.filters);
  const setInvoiceFilters = useInvoiceFilterStore((s) => s.setFilters);
  const resetInvoiceFilters = useInvoiceFilterStore((s) => s.resetFilters);
  const itemFilters = useItemFilterStore((s) => s.filters);
  const setItemFilters = useItemFilterStore((s) => s.setFilters);
  const resetItemFilters = useItemFilterStore((s) => s.resetFilters);

  const filters = target === 'invoices' ? invoiceFilters : itemFilters;
  const setFilters = target === 'invoices' ? setInvoiceFilters : setItemFilters;
  const resetFilters = target === 'invoices' ? resetInvoiceFilters : resetItemFilters;

  const chips = useMemo(() => {
    const list: { label: string; key: keyof InvoiceFilters }[] = [];
    if (filters.search) list.push({ label: `Search: "${filters.search}"`, key: 'search' });
    if (filters.date_from) list.push({ label: `From: ${filters.date_from}`, key: 'date_from' });
    if (filters.date_to) list.push({ label: `To: ${filters.date_to}`, key: 'date_to' });
    if (filters.categories?.length) list.push({ label: `${filters.categories.length} categories`, key: 'categories' });
    if (filters.delivery_partners?.length) list.push({ label: `${filters.delivery_partners.length} partners`, key: 'delivery_partners' });
    if (filters.price_min != null) list.push({ label: `Min: ${filters.price_min}`, key: 'price_min' });
    if (filters.price_max != null) list.push({ label: `Max: ${filters.price_max}`, key: 'price_max' });
    if (filters.spending_pattern) list.push({ label: filters.spending_pattern.replace('_', ' '), key: 'spending_pattern' });
    if (filters.sort_by && filters.sort_by !== 'date') list.push({ label: `Sort: ${filters.sort_by}`, key: 'sort_by' });
    return list;
  }, [filters]);

  if (chips.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          onClose={() => setFilters({ [chip.key]: undefined })}
          style={styles.chip}
          textStyle={{ fontSize: 12 }}
          compact
        >
          {chip.label}
        </Chip>
      ))}
      {chips.length > 1 && (
        <Chip
          onPress={resetFilters}
          icon="close-circle"
          style={[styles.chip, { backgroundColor: theme.colors.errorContainer }]}
          textStyle={{ fontSize: 12, color: theme.colors.onErrorContainer }}
          compact
        >
          Clear all
        </Chip>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
  },
  content: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    height: 32,
  },
});
