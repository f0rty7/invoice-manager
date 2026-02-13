import { create } from 'zustand';
import type { InvoiceFilters } from '../types';
import { PAGE_SIZE } from '../utils/constants';

interface ItemFilterState {
  filters: InvoiceFilters;
  page: number;

  setFilters: (partial: Partial<InvoiceFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

const DEFAULT_FILTERS: InvoiceFilters = {
  page: 1,
  limit: PAGE_SIZE,
  sort_by: 'date',
  sort_dir: 'desc',
};

export const useItemFilterStore = create<ItemFilterState>((set, get) => ({
  filters: { ...DEFAULT_FILTERS },
  page: 1,

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial, page: 1 },
      page: 1,
    })),

  resetFilters: () =>
    set({ filters: { ...DEFAULT_FILTERS }, page: 1 }),

  setPage: (page) =>
    set((state) => ({
      page,
      filters: { ...state.filters, page },
    })),

  nextPage: () => {
    const next = get().page + 1;
    set((state) => ({
      page: next,
      filters: { ...state.filters, page: next },
    }));
  },

  previousPage: () => {
    const prev = Math.max(1, get().page - 1);
    set((state) => ({
      page: prev,
      filters: { ...state.filters, page: prev },
    }));
  },
}));
