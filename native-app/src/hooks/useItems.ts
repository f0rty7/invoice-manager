import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { searchItems, aggregateItems } from '../api/invoices.api';
import { useItemFilterStore } from '../stores/itemFilterStore';
import { PAGE_SIZE } from '../utils/constants';

export function useItemList() {
  const filters = useItemFilterStore((s) => s.filters);

  return useInfiniteQuery({
    queryKey: ['items', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await searchItems({ ...filters, page: pageParam, limit: PAGE_SIZE });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load items');
      return res.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

export function useItemAggregate() {
  const filters = useItemFilterStore((s) => s.filters);
  const { page: _p, limit: _l, ...queryFilters } = filters;

  return useQuery({
    queryKey: ['items', 'aggregate', queryFilters],
    queryFn: async () => {
      const res = await aggregateItems(queryFilters);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load aggregates');
      return res.data;
    },
  });
}
