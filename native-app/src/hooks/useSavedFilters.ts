import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSavedFilters,
  getDefaultFilter,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  setDefaultFilter,
} from '../api/filters.api';
import type { InvoiceFilters } from '../types';

export function useSavedFiltersList() {
  return useQuery({
    queryKey: ['savedFilters'],
    queryFn: async () => {
      const res = await getSavedFilters();
      if (!res.success) throw new Error(res.error ?? 'Failed to load saved filters');
      return res.data ?? [];
    },
  });
}

export function useDefaultFilter() {
  return useQuery({
    queryKey: ['savedFilters', 'default'],
    queryFn: async () => {
      const res = await getDefaultFilter();
      return res.data ?? null;
    },
  });
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; filters: InvoiceFilters; isDefault?: boolean }) =>
      createSavedFilter(args.name, args.filters, args.isDefault),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedFilters'] }),
  });
}

export function useUpdateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: { name?: string; filters?: InvoiceFilters; is_default?: boolean } }) =>
      updateSavedFilter(args.id, args.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedFilters'] }),
  });
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedFilter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedFilters'] }),
  });
}

export function useSetDefaultFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultFilter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savedFilters'] }),
  });
}
