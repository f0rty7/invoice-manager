// Invoice item interface
export interface InvoiceItem {
  sr: number;
  description: string;
  qty: number;
  unit_price: number | null;
  price: number | null;
  category: string;
}

// Flat item interface (item with parent invoice data)
export interface FlatItem {
  sr: number;
  description: string;
  qty: number;
  unit_price: number | null;
  price: number | null;
  category: string;
  // Parent invoice fields
  invoice_id: string;
  invoice_no: string | null;
  order_no: string | string[] | null;
  date: string | null;
  delivery_partner: string | null;
}

// Delivery partner interface
export interface DeliveryPartner {
  registered_name: string | null;
  known_name: string | null;
}

// Invoice interface
export interface Invoice {
  _id?: string;
  order_no: string | string[] | null;
  invoice_no: string | null;
  date: string | null;
  // NEW: Parsed Date for correct sorting/filtering (preferred over `date` string)
  date_obj?: Date | null;
  user_id?: string;
  username?: string;
  delivery_partner: DeliveryPartner | null;
  items: InvoiceItem[];
  items_total: number | null;
  // NEW: Pre-computed item count for fast filtering/sorting
  items_count?: number;
  created_at?: Date;
  updated_at?: Date;
}

// Parse result interface
export interface ParseResult {
  invoices: Invoice[];
}

// User interface
export interface User {
  _id?: string;
  username: string;
  password: string;
  email?: string;
  role: 'user' | 'admin';
  created_at?: Date;
  updated_at?: Date;
}

// Auth interfaces
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

// Filter interfaces
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
  // Phase 1: Quick Wins
  delivery_partner?: string;
  // NEW: Multi-select partners (inclusion)
  delivery_partners?: string[];
  search?: string;              // Combined text search
  order_no?: string;            // Direct order search
  invoice_no?: string;          // Direct invoice search
  sort_by?: 'date' | 'total' | 'items_count' | 'delivery_partner' | 'price' | 'qty' | 'category';
  sort_dir?: 'asc' | 'desc';
  // Phase 2: Core Enhancements
  categories?: string[];        // Multi-select categories
  item_search?: string;         // Search within item descriptions
  item_qty_min?: number;
  item_qty_max?: number;
  item_unit_price_min?: number;
  item_unit_price_max?: number;
  items_count_min?: number;
  items_count_max?: number;
  // Phase 3: Time and Pattern Filters
  day_of_week?: number[];       // 0=Sun, 1=Mon, etc.
  month?: number;               // 1-12
  year?: number;                // e.g., 2024, 2025
  is_weekend?: boolean;
  exclude_categories?: string[];
  exclude_delivery_partners?: string[];
  spending_pattern?: 'above_avg' | 'below_avg' | 'top_10_pct' | 'bottom_10_pct';
}

// Statistics interface
export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  by_category: Record<string, { count: number; total: number }>;
  by_month: Record<string, { count: number; total: number }>;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Saved Filter interface (Phase 4)
export interface SavedFilter {
  _id?: string;
  user_id: string;
  name: string;
  filters: InvoiceFilters;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Filter options (for header multi-select menus)
export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterOptionsResponse {
  partners: FilterOption[];
  categories: FilterOption[];
}

