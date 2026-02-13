import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api/invoices.api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await getStats();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load stats');
      return res.data;
    },
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
