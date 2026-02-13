import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AdminScreenProps } from '../navigation/types';
import { useUiStore } from '../stores/uiStore';
import InvoiceList from '../components/InvoiceList';
import StatsCards from '../components/StatsCards';
import FilterChips from '../components/FilterChips';
import FilterSheet from '../components/FilterSheet';
import UploadSheet from '../components/UploadSheet';

export default function AdminScreen({ navigation }: AdminScreenProps) {
  const theme = useTheme();
  const { openFilterSheet, openUploadSheet } = useUiStore();

  const header = (
    <>
      <StatsCards />
      <FilterChips target="invoices" />
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Admin Panel" />
        <Appbar.Action icon="filter-variant" onPress={openFilterSheet} />
        <Appbar.Action icon="upload" onPress={openUploadSheet} />
      </Appbar.Header>

      <InvoiceList showUploader ListHeaderComponent={header} />
      <FilterSheet />
      <UploadSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
