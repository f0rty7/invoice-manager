import apiClient from './client';
import type { SavedFilter, InvoiceFilters, ApiResponse } from '../types';

const FILTERS_URL = '/api/filters';

export async function getSavedFilters() {
  const res = await apiClient.get<ApiResponse<SavedFilter[]>>(FILTERS_URL);
  return res.data;
}

export async function getDefaultFilter() {
  const res = await apiClient.get<ApiResponse<SavedFilter | null>>(`${FILTERS_URL}/default`);
  return res.data;
}

export async function createSavedFilter(name: string, filters: InvoiceFilters, isDefault = false) {
  const res = await apiClient.post<ApiResponse<SavedFilter>>(FILTERS_URL, {
    name,
    filters,
    is_default: isDefault,
  });
  return res.data;
}

export async function updateSavedFilter(
  id: string,
  data: { name?: string; filters?: InvoiceFilters; is_default?: boolean },
) {
  const res = await apiClient.put<ApiResponse<SavedFilter>>(`${FILTERS_URL}/${id}`, data);
  return res.data;
}

export async function deleteSavedFilter(id: string) {
  const res = await apiClient.delete<ApiResponse<void>>(`${FILTERS_URL}/${id}`);
  return res.data;
}

export async function setDefaultFilter(id: string) {
  const res = await apiClient.post<ApiResponse<SavedFilter>>(`${FILTERS_URL}/${id}/default`, {});
  return res.data;
}
