// Invoice item interface
export interface InvoiceItem {
  sr: number;
  description: string;
  qty: number;
  unit_price: number | null;
  price: number | null;
  category: string;
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
  user_id?: string;
  username?: string;
  delivery_partner: DeliveryPartner | null;
  items: InvoiceItem[];
  items_total: number | null;
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

