import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InvoiceCard from './InvoiceCard';
import type { Invoice } from '../types';
import type { AppStackParamList } from '../navigation/types';
import { useInvoiceList, useDeleteInvoice } from '../hooks/useInvoices';
import { useAuthStore } from '../stores/authStore';

interface Props {
  showUploader?: boolean;
  ListHeaderComponent?: React.ReactElement;
}

export default function InvoiceList({ showUploader, ListHeaderComponent }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch } = useInvoiceList();
  const deleteMutation = useDeleteInvoice();

  const invoices = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const handlePress = useCallback(
    (invoice: Invoice) => {
      if (invoice._id) {
        navigation.navigate('InvoiceDetail', { invoiceId: invoice._id });
      }
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (invoice: Invoice) => {
      if (invoice._id) {
        deleteMutation.mutate(invoice._id);
      }
    },
    [deleteMutation],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Invoice }) => (
      <InvoiceCard
        invoice={item}
        onPress={handlePress}
        onDelete={isAdmin ? handleDelete : undefined}
        showUploader={showUploader}
      />
    ),
    [handlePress, handleDelete, isAdmin, showUploader],
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {error?.message ?? 'Failed to load invoices'}
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={invoices}
      renderItem={renderItem}
      keyExtractor={(item) => item._id ?? String(item.invoice_no)}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            No invoices found
          </Text>
        </View>
      }
      onRefresh={refetch}
      refreshing={false}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
