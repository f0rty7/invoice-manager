export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

export const CATEGORIES = [
  'Fresh Produce – Fruits',
  'Fresh Produce – Vegetables & Herbs',
  'Staples & Pantry',
  'Spices, Condiments & Cooking Essentials',
  'Dairy & Eggs',
  'Bakery & Bread',
  'Snacks & Salty Snacks',
  'Confectionery & Sweet Tooth',
  'Frozen & Refrigerated Items',
  'Instant & Ready-to-Cook Foods',
  'Beverages & Drinks',
  'Tobacco & Related',
  'Household, Personal Care & Miscellaneous',
  'Charges & Fees',
  'Others',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export const SPENDING_PATTERNS = [
  { value: 'above_avg' as const, label: 'Above Average' },
  { value: 'below_avg' as const, label: 'Below Average' },
  { value: 'top_10_pct' as const, label: 'Top 10%' },
  { value: 'bottom_10_pct' as const, label: 'Bottom 10%' },
] as const;

export const SORT_OPTIONS_INVOICES = [
  { value: 'date' as const, label: 'Date' },
  { value: 'total' as const, label: 'Total Amount' },
  { value: 'items_count' as const, label: 'Items Count' },
  { value: 'delivery_partner' as const, label: 'Delivery Partner' },
] as const;

export const SORT_OPTIONS_ITEMS = [
  { value: 'date' as const, label: 'Date' },
  { value: 'price' as const, label: 'Price' },
  { value: 'qty' as const, label: 'Quantity' },
  { value: 'category' as const, label: 'Category' },
] as const;

export const PAGE_SIZE = 20;

export const MIN_SYNC_INTERVAL_MS = 60_000; // 60 seconds between auto-syncs
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
