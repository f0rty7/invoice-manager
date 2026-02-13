import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Text,
  TextInput,
  Button,
  Chip,
  Divider,
  SegmentedButtons,
  useTheme,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useUiStore } from '../stores/uiStore';
import { useInvoiceFilterStore } from '../stores/invoiceFilterStore';
import { useItemFilterStore } from '../stores/itemFilterStore';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { useSavedFiltersList, useCreateSavedFilter, useDeleteSavedFilter, useSetDefaultFilter } from '../hooks/useSavedFilters';
import { SPENDING_PATTERNS, SORT_OPTIONS_INVOICES, SORT_OPTIONS_ITEMS, DAYS_OF_WEEK, MONTHS } from '../utils/constants';
import type { InvoiceFilters } from '../types';

export default function FilterSheet() {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const isOpen = useUiStore((s) => s.isFilterSheetOpen);
  const closeSheet = useUiStore((s) => s.closeFilterSheet);
  const activeTab = useUiStore((s) => s.activeTab);

  const invoiceFilters = useInvoiceFilterStore((s) => s.filters);
  const setInvoiceFilters = useInvoiceFilterStore((s) => s.setFilters);
  const resetInvoiceFilters = useInvoiceFilterStore((s) => s.resetFilters);

  const itemFilters = useItemFilterStore((s) => s.filters);
  const setItemFilters = useItemFilterStore((s) => s.setFilters);
  const resetItemFilters = useItemFilterStore((s) => s.resetFilters);

  const filters = activeTab === 'invoices' ? invoiceFilters : itemFilters;
  const setFilters = activeTab === 'invoices' ? setInvoiceFilters : setItemFilters;
  const resetFilters = activeTab === 'invoices' ? resetInvoiceFilters : resetItemFilters;

  const { data: filterOptions } = useFilterOptions();
  const { data: savedFilters } = useSavedFiltersList();
  const createFilter = useCreateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();
  const setDefault = useSetDefaultFilter();

  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [filterName, setFilterName] = useState('');

  const sortOptions = activeTab === 'invoices' ? SORT_OPTIONS_INVOICES : SORT_OPTIONS_ITEMS;

  const handleCategoryToggle = useCallback(
    (cat: string) => {
      const current = filters.categories ?? [];
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      setFilters({ categories: updated.length ? updated : undefined });
    },
    [filters.categories, setFilters],
  );

  const handlePartnerToggle = useCallback(
    (partner: string) => {
      const current = filters.delivery_partners ?? [];
      const updated = current.includes(partner)
        ? current.filter((p) => p !== partner)
        : [...current, partner];
      setFilters({ delivery_partners: updated.length ? updated : undefined });
    },
    [filters.delivery_partners, setFilters],
  );

  const handleSaveFilter = useCallback(() => {
    if (!filterName.trim()) return;
    const { page, limit, ...cleanFilters } = filters;
    createFilter.mutate({ name: filterName.trim(), filters: cleanFilters });
    setFilterName('');
    setSaveDialogVisible(false);
  }, [filterName, filters, createFilter]);

  const handleLoadSavedFilter = useCallback(
    (savedFilter: { filters: InvoiceFilters }) => {
      setFilters(savedFilter.filters);
      closeSheet();
    },
    [setFilters, closeSheet],
  );

  if (!isOpen) return null;

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={closeSheet}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.outline }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text variant="titleLarge">Filters</Text>
            <View style={styles.headerActions}>
              <Button compact onPress={() => setSaveDialogVisible(true)}>Save</Button>
              <Button compact onPress={resetFilters}>Clear</Button>
            </View>
          </View>

          <Divider />

          {/* Saved Filters */}
          {savedFilters && savedFilters.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>Saved Filters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {savedFilters.map((sf) => (
                    <Chip
                      key={sf._id}
                      onPress={() => handleLoadSavedFilter(sf)}
                      onClose={() => sf._id && deleteFilter.mutate(sf._id)}
                      compact
                      selected={sf.is_default}
                    >
                      {sf.name}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Search */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Search</Text>
            <TextInput
              mode="outlined"
              placeholder="Search invoices..."
              value={filters.search ?? ''}
              onChangeText={(t) => setFilters({ search: t || undefined })}
              left={<TextInput.Icon icon="magnify" />}
              dense
            />
          </View>

          {/* Sort */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Sort By</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {sortOptions.map((opt) => (
                  <Chip
                    key={opt.value}
                    selected={filters.sort_by === opt.value}
                    onPress={() => setFilters({ sort_by: opt.value as InvoiceFilters['sort_by'] })}
                    compact
                  >
                    {opt.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
            <SegmentedButtons
              value={filters.sort_dir ?? 'desc'}
              onValueChange={(v) => setFilters({ sort_dir: v as 'asc' | 'desc' })}
              buttons={[
                { value: 'asc', label: 'Ascending', icon: 'arrow-up' },
                { value: 'desc', label: 'Descending', icon: 'arrow-down' },
              ]}
              style={styles.segmented}
            />
          </View>

          {/* Date Range */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.dateRow}>
              <TextInput
                mode="outlined"
                label="From"
                placeholder="YYYY-MM-DD"
                value={filters.date_from ?? ''}
                onChangeText={(t) => setFilters({ date_from: t || undefined })}
                style={styles.dateInput}
                dense
              />
              <TextInput
                mode="outlined"
                label="To"
                placeholder="YYYY-MM-DD"
                value={filters.date_to ?? ''}
                onChangeText={(t) => setFilters({ date_to: t || undefined })}
                style={styles.dateInput}
                dense
              />
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Price Range</Text>
            <View style={styles.dateRow}>
              <TextInput
                mode="outlined"
                label="Min"
                value={filters.price_min != null ? String(filters.price_min) : ''}
                onChangeText={(t) => setFilters({ price_min: t ? Number(t) : undefined })}
                keyboardType="numeric"
                style={styles.dateInput}
                dense
              />
              <TextInput
                mode="outlined"
                label="Max"
                value={filters.price_max != null ? String(filters.price_max) : ''}
                onChangeText={(t) => setFilters({ price_max: t ? Number(t) : undefined })}
                keyboardType="numeric"
                style={styles.dateInput}
                dense
              />
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Categories</Text>
            <View style={styles.wrapRow}>
              {(filterOptions?.categories ?? []).map((cat) => (
                <Chip
                  key={cat.value}
                  selected={filters.categories?.includes(cat.value)}
                  onPress={() => handleCategoryToggle(cat.value)}
                  compact
                  textStyle={{ fontSize: 11 }}
                >
                  {cat.value} ({cat.count})
                </Chip>
              ))}
            </View>
          </View>

          {/* Delivery Partners */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Delivery Partners</Text>
            <View style={styles.wrapRow}>
              {(filterOptions?.partners ?? []).map((p) => (
                <Chip
                  key={p.value}
                  selected={filters.delivery_partners?.includes(p.value)}
                  onPress={() => handlePartnerToggle(p.value)}
                  compact
                  textStyle={{ fontSize: 11 }}
                >
                  {p.value} ({p.count})
                </Chip>
              ))}
            </View>
          </View>

          {/* Spending Pattern */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Spending Pattern</Text>
            <View style={styles.chipRow}>
              {SPENDING_PATTERNS.map((sp) => (
                <Chip
                  key={sp.value}
                  selected={filters.spending_pattern === sp.value}
                  onPress={() =>
                    setFilters({
                      spending_pattern: filters.spending_pattern === sp.value ? undefined : sp.value,
                    })
                  }
                  compact
                >
                  {sp.label}
                </Chip>
              ))}
            </View>
          </View>

          {/* Day of Week */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Day of Week</Text>
            <View style={styles.chipRow}>
              {DAYS_OF_WEEK.map((d) => (
                <Chip
                  key={d.value}
                  selected={filters.day_of_week?.includes(d.value)}
                  onPress={() => {
                    const current = filters.day_of_week ?? [];
                    const updated = current.includes(d.value)
                      ? current.filter((v) => v !== d.value)
                      : [...current, d.value];
                    setFilters({ day_of_week: updated.length ? updated : undefined });
                  }}
                  compact
                >
                  {d.label}
                </Chip>
              ))}
            </View>
          </View>

          {/* Apply Button */}
          <Button mode="contained" onPress={closeSheet} style={styles.applyButton}>
            Apply Filters
          </Button>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Save Filter Dialog */}
      <Portal>
        <Dialog visible={saveDialogVisible} onDismiss={() => setSaveDialogVisible(false)}>
          <Dialog.Title>Save Filter</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Filter Name"
              value={filterName}
              onChangeText={setFilterName}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSaveDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveFilter} disabled={!filterName.trim()}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  segmented: {
    marginTop: 8,
  },
  applyButton: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
});
