import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { 
  Invoice, 
  InvoiceFilters, 
  InvoiceStats, 
  ApiResponse, 
  PaginatedResponse 
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
}

