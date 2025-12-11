import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { 
  Invoice, 
  InvoiceFilters, 
  InvoiceStats, 
  ApiResponse, 
  PaginatedResponse,
  SavedFilter,
  FlatItem
} from '@pdf-invoice/shared';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly API_URL = '/api/invoices';

  constructor(private http: HttpClient) {}

  uploadPDFs(files: File[]): Observable<ApiResponse<any>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<ApiResponse<any>>(`${this.API_URL}/upload`, formData);
  }

  getInvoices(filters: InvoiceFilters): Observable<ApiResponse<PaginatedResponse<Invoice>>> {
    let params = new HttpParams();
    
    if (filters.user_id) params = params.set('user_id', filters.user_id);
    if (filters.username) params = params.set('username', filters.username);
    if (filters.date_from) params = params.set('date_from', filters.date_from);
    if (filters.date_to) params = params.set('date_to', filters.date_to);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.price_min !== undefined) params = params.set('price_min', filters.price_min.toString());
    if (filters.price_max !== undefined) params = params.set('price_max', filters.price_max.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    // Phase 1: New filters
    if (filters.delivery_partner) params = params.set('delivery_partner', filters.delivery_partner);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.order_no) params = params.set('order_no', filters.order_no);
    if (filters.invoice_no) params = params.set('invoice_no', filters.invoice_no);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_dir) params = params.set('sort_dir', filters.sort_dir);
    // Phase 2: Core enhancements
    if (filters.categories?.length) params = params.set('categories', filters.categories.join(','));
    if (filters.item_search) params = params.set('item_search', filters.item_search);
    if (filters.item_qty_min !== undefined) params = params.set('item_qty_min', filters.item_qty_min.toString());
    if (filters.item_qty_max !== undefined) params = params.set('item_qty_max', filters.item_qty_max.toString());
    if (filters.item_unit_price_min !== undefined) params = params.set('item_unit_price_min', filters.item_unit_price_min.toString());
    if (filters.item_unit_price_max !== undefined) params = params.set('item_unit_price_max', filters.item_unit_price_max.toString());
    if (filters.items_count_min !== undefined) params = params.set('items_count_min', filters.items_count_min.toString());
    if (filters.items_count_max !== undefined) params = params.set('items_count_max', filters.items_count_max.toString());
    // Phase 3: Time and pattern filters
    if (filters.day_of_week?.length) params = params.set('day_of_week', filters.day_of_week.join(','));
    if (filters.month !== undefined) params = params.set('month', filters.month.toString());
    if (filters.year !== undefined) params = params.set('year', filters.year.toString());
    if (filters.is_weekend !== undefined) params = params.set('is_weekend', filters.is_weekend.toString());
    if (filters.exclude_categories?.length) params = params.set('exclude_categories', filters.exclude_categories.join(','));
    if (filters.exclude_delivery_partners?.length) params = params.set('exclude_delivery_partners', filters.exclude_delivery_partners.join(','));
    if (filters.spending_pattern) params = params.set('spending_pattern', filters.spending_pattern);

    return this.http.get<ApiResponse<PaginatedResponse<Invoice>>>(this.API_URL, { params });
  }

  getInvoiceById(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.API_URL}/${id}`);
  }

  deleteInvoice(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/${id}`);
  }

  getStats(): Observable<ApiResponse<InvoiceStats>> {
    return this.http.get<ApiResponse<InvoiceStats>>(`${this.API_URL}/stats/summary`);
  }

  getCategories(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/categories`);
  }

  getDeliveryPartners(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/delivery-partners`);
  }

  getItems(filters: InvoiceFilters): Observable<ApiResponse<PaginatedResponse<FlatItem>>> {
    let params = new HttpParams();
    
    if (filters.user_id) params = params.set('user_id', filters.user_id);
    if (filters.username) params = params.set('username', filters.username);
    if (filters.date_from) params = params.set('date_from', filters.date_from);
    if (filters.date_to) params = params.set('date_to', filters.date_to);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.price_min !== undefined) params = params.set('price_min', filters.price_min.toString());
    if (filters.price_max !== undefined) params = params.set('price_max', filters.price_max.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.delivery_partner) params = params.set('delivery_partner', filters.delivery_partner);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.order_no) params = params.set('order_no', filters.order_no);
    if (filters.invoice_no) params = params.set('invoice_no', filters.invoice_no);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_dir) params = params.set('sort_dir', filters.sort_dir);
    if (filters.categories?.length) params = params.set('categories', filters.categories.join(','));
    if (filters.item_search) params = params.set('item_search', filters.item_search);
    if (filters.item_qty_min !== undefined) params = params.set('item_qty_min', filters.item_qty_min.toString());
    if (filters.item_qty_max !== undefined) params = params.set('item_qty_max', filters.item_qty_max.toString());
    if (filters.item_unit_price_min !== undefined) params = params.set('item_unit_price_min', filters.item_unit_price_min.toString());
    if (filters.item_unit_price_max !== undefined) params = params.set('item_unit_price_max', filters.item_unit_price_max.toString());
    if (filters.exclude_categories?.length) params = params.set('exclude_categories', filters.exclude_categories.join(','));
    if (filters.exclude_delivery_partners?.length) params = params.set('exclude_delivery_partners', filters.exclude_delivery_partners.join(','));

    return this.http.get<ApiResponse<PaginatedResponse<FlatItem>>>(`${this.API_URL}/items`, { params });
  }

  // Saved Filters API (Phase 4)
  private readonly FILTERS_URL = '/api/filters';

  getSavedFilters(): Observable<ApiResponse<SavedFilter[]>> {
    return this.http.get<ApiResponse<SavedFilter[]>>(this.FILTERS_URL);
  }

  getDefaultFilter(): Observable<ApiResponse<SavedFilter | null>> {
    return this.http.get<ApiResponse<SavedFilter | null>>(`${this.FILTERS_URL}/default`);
  }

  createSavedFilter(name: string, filters: InvoiceFilters, isDefault = false): Observable<ApiResponse<SavedFilter>> {
    return this.http.post<ApiResponse<SavedFilter>>(this.FILTERS_URL, {
      name,
      filters,
      is_default: isDefault
    });
  }

  updateSavedFilter(id: string, data: { name?: string; filters?: InvoiceFilters; is_default?: boolean }): Observable<ApiResponse<SavedFilter>> {
    return this.http.put<ApiResponse<SavedFilter>>(`${this.FILTERS_URL}/${id}`, data);
  }

  deleteSavedFilter(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.FILTERS_URL}/${id}`);
  }

  setDefaultFilter(id: string): Observable<ApiResponse<SavedFilter>> {
    return this.http.post<ApiResponse<SavedFilter>>(`${this.FILTERS_URL}/${id}/default`, {});
  }
}

