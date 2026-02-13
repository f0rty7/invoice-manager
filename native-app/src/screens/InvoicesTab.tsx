import React from 'react';
import { View, StyleSheet } from 'react-native';
import InvoiceList from '../components/InvoiceList';
import StatsCards from '../components/StatsCards';
import FilterChips from '../components/FilterChips';
import SyncStatusBanner from '../components/sync/SyncStatusBanner';

export default function InvoicesTab() {
  const header = (
    <View style={styles.header}>
      <SyncStatusBanner />
      <StatsCards />
      <FilterChips target="invoices" />
    </View>
  );

  return <InvoiceList ListHeaderComponent={header} />;
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 8,
  },
});
