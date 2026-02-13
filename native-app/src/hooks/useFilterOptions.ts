import { useQuery } from '@tanstack/react-query';
import { getFilterOptions } from '../api/invoices.api';

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const res = await getFilterOptions();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load filter options');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
