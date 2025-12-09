// Re-export all types
export * from './types';

// Export category list
export const CATEGORIES = [
  'Tobacco',
  'Snacks & Munchies',
  'Savories | Sweet Tooth',
  'Fruits',
  'Instant foods',
  'Dairy',
  'Beverages',
  'Refreshments',
  'Groceries',
  'Charges',
  'Others'
] as const;

export type Category = typeof CATEGORIES[number];

