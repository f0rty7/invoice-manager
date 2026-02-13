import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchInvoices, aggregateInvoices, deleteInvoice } from '../api/invoices.api';
import { useInvoiceFilterStore } from '../stores/invoiceFilterStore';
import type { Invoice, PaginatedResponse, ApiResponse } from '../types';
import { PAGE_SIZE } from '../utils/constants';

export function useInvoiceList() {
  const filters = useInvoiceFilterStore((s) => s.filters);

  return useInfiniteQuery({
    queryKey: ['invoices', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await searchInvoices({ ...filters, page: pageParam, limit: PAGE_SIZE });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load invoices');
      return res.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

export function useInvoiceAggregate() {
  const filters = useInvoiceFilterStore((s) => s.filters);
  const { page: _p, limit: _l, ...queryFilters } = filters;

  return useQuery({
    queryKey: ['invoices', 'aggregate', queryFilters],
    queryFn: async () => {
      const res = await aggregateInvoices(queryFilters);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load aggregates');
      return res.data;
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
