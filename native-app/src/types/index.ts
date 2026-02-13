// ─── Invoice Types ───────────────────────────────────────────────────────────

export interface InvoiceItem {
  sr: number;
  description: string;
  qty: number;
  unit_price: number | null;
  price: number | null;
  category: string;
}

export interface FlatItem {
  sr: number;
  description: string;
  qty: number;
  unit_price: number | null;
  price: number | null;
  category: string;
  invoice_id: string;
  invoice_no: string | null;
  order_no: string | string[] | null;
  date: string | null;
  delivery_partner: string | null;
}

export interface DeliveryPartner {
  registered_name: string | null;
  known_name: string | null;
}

export interface Invoice {
  _id?: string;
  order_no: string | string[] | null;
  invoice_no: string | null;
  date: string | null;
  date_obj?: Date | null;
  user_id?: string;
  username?: string;
  delivery_partner: DeliveryPartner | null;
  items: InvoiceItem[];
  items_total: number | null;
  items_count?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface ParseResult {
  invoices: Invoice[];
}

// ─── User & Auth Types ──────────────────────────────────────────────────────

export interface User {
  _id?: string;
  username: string;
  password: string;
  email?: string;
  role: 'user' | 'admin';
  created_at?: Date;
  updated_at?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'user' | 'admin';
  };
}

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface InvoiceFilters {
  user_id?: string;
  username?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
  price_min?: number;
  price_max?: number;
  page?: number;
  limit?: number;
  delivery_partner?: string;
  delivery_partners?: string[];
  search?: string;
  order_no?: string;
  invoice_no?: string;
  sort_by?: 'date' | 'total' | 'items_count' | 'delivery_partner' | 'price' | 'qty' | 'category';
  sort_dir?: 'asc' | 'desc';
  categories?: string[];
  item_search?: string;
  item_qty_min?: number;
  item_qty_max?: number;
  item_unit_price_min?: number;
  item_unit_price_max?: number;
  items_count_min?: number;
  items_count_max?: number;
  day_of_week?: number[];
  month?: number;
  year?: number;
  is_weekend?: boolean;
  exclude_categories?: string[];
  exclude_delivery_partners?: string[];
  spending_pattern?: 'above_avg' | 'below_avg' | 'top_10_pct' | 'bottom_10_pct';
}

export interface SavedFilter {
  _id?: string;
  user_id: string;
  name: string;
  filters: InvoiceFilters;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterOptionsResponse {
  partners: FilterOption[];
  categories: FilterOption[];
}

// ─── Statistics Types ───────────────────────────────────────────────────────

export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  by_category: Record<string, { count: number; total: number }>;
  by_month: Record<string, { count: number; total: number }>;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ─── Sync Types ─────────────────────────────────────────────────────────────

export interface SyncFileRecord {
  filename: string;
  syncedAt: string;
  size: number;
  result: 'success' | 'error';
  errorMessage?: string;
  invoiceCount?: number;
}

export interface UploadResult {
  filename: string;
  success: boolean;
  inserted?: number;
  error?: string;
}
