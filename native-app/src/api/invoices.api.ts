import apiClient from './client';
import type {
  Invoice,
  FlatItem,
  InvoiceFilters,
  InvoiceStats,
  ApiResponse,
  PaginatedResponse,
  FilterOptionsResponse,
} from '../types';

const API_URL = '/api/invoices';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildParams(filters: InvoiceFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.username) params.username = filters.username;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.category) params.category = filters.category;
  if (filters.price_min != null) params.price_min = String(filters.price_min);
  if (filters.price_max != null) params.price_max = String(filters.price_max);
  if (filters.page != null) params.page = String(filters.page);
  if (filters.limit != null) params.limit = String(filters.limit);
  if (filters.delivery_partner) params.delivery_partner = filters.delivery_partner;
  if (filters.delivery_partners?.length) params.delivery_partners = filters.delivery_partners.join(',');
  if (filters.search) params.search = filters.search;
  if (filters.order_no) params.order_no = filters.order_no;
  if (filters.invoice_no) params.invoice_no = filters.invoice_no;
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_dir) params.sort_dir = filters.sort_dir;
  if (filters.categories?.length) params.categories = filters.categories.join(',');
  if (filters.item_search) params.item_search = filters.item_search;
  if (filters.item_qty_min != null) params.item_qty_min = String(filters.item_qty_min);
  if (filters.item_qty_max != null) params.item_qty_max = String(filters.item_qty_max);
  if (filters.item_unit_price_min != null) params.item_unit_price_min = String(filters.item_unit_price_min);
  if (filters.item_unit_price_max != null) params.item_unit_price_max = String(filters.item_unit_price_max);
  if (filters.items_count_min != null) params.items_count_min = String(filters.items_count_min);
  if (filters.items_count_max != null) params.items_count_max = String(filters.items_count_max);
  if (filters.day_of_week?.length) params.day_of_week = filters.day_of_week.join(',');
  if (filters.month != null) params.month = String(filters.month);
  if (filters.year != null) params.year = String(filters.year);
  if (filters.is_weekend != null) params.is_weekend = String(filters.is_weekend);
  if (filters.exclude_categories?.length) params.exclude_categories = filters.exclude_categories.join(',');
  if (filters.exclude_delivery_partners?.length) params.exclude_delivery_partners = filters.exclude_delivery_partners.join(',');
  if (filters.spending_pattern) params.spending_pattern = filters.spending_pattern;

  return params;
}

// ─── Invoice endpoints ──────────────────────────────────────────────────────

export async function getInvoices(filters: InvoiceFilters) {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Invoice>>>(API_URL, {
    params: buildParams(filters),
  });
  return res.data;
}

export async function searchInvoices(filters: InvoiceFilters) {
  const res = await apiClient.post<ApiResponse<PaginatedResponse<Invoice>>>(`${API_URL}/search`, filters);
  return res.data;
}

export async function aggregateInvoices(filters: InvoiceFilters) {
  const res = await apiClient.post<ApiResponse<{ total_amount: number; total_count: number }>>(
    `${API_URL}/aggregate`,
    filters,
  );
  return res.data;
}

export async function getInvoiceById(id: string) {
  const res = await apiClient.get<ApiResponse<Invoice>>(`${API_URL}/${id}`);
  return res.data;
}

export async function deleteInvoice(id: string) {
  const res = await apiClient.delete<ApiResponse<unknown>>(`${API_URL}/${id}`);
  return res.data;
}

export async function getStats() {
  const res = await apiClient.get<ApiResponse<InvoiceStats>>(`${API_URL}/stats/summary`);
  return res.data;
}

export async function getCategories() {
  const res = await apiClient.get<ApiResponse<string[]>>(`${API_URL}/categories`);
  return res.data;
}

export async function getDeliveryPartners() {
  const res = await apiClient.get<ApiResponse<string[]>>(`${API_URL}/delivery-partners`);
  return res.data;
}

export async function getFilterOptions() {
  const res = await apiClient.get<ApiResponse<FilterOptionsResponse>>(`${API_URL}/filter-options`);
  return res.data;
}

// ─── Items endpoints ────────────────────────────────────────────────────────

export async function getItems(filters: InvoiceFilters) {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<FlatItem>>>(`${API_URL}/items`, {
    params: buildParams(filters),
  });
  return res.data;
}

export async function searchItems(filters: InvoiceFilters) {
  const res = await apiClient.post<ApiResponse<PaginatedResponse<FlatItem>>>(`${API_URL}/items/search`, filters);
  return res.data;
}

export async function aggregateItems(filters: InvoiceFilters) {
  const res = await apiClient.post<ApiResponse<{ total_price: number; total_count: number }>>(
    `${API_URL}/items/aggregate`,
    filters,
  );
  return res.data;
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export async function uploadPDFs(
  fileUris: { uri: string; name: string; type: string }[],
  onProgress?: (pct: number) => void,
) {
  const formData = new FormData();
  fileUris.forEach((f) => {
    formData.append('files', {
      uri: f.uri,
      name: f.name,
      type: f.type,
    } as unknown as Blob);
  });

  const res = await apiClient.post<ApiResponse<{ results: Array<{ filename: string; success: boolean; inserted?: number; error?: string }> }>>(
    `${API_URL}/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    },
  );
  return res.data;
}
