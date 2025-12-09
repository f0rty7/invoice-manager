// Re-export all types
export * from './types';

// Export category list
export const CATEGORIES = [
  'Tobacco',
  'Snacks & Munchies',
  'Savories | Sweet Tooth',
  'Dairy',
  'Beverages',
  'Groceries',
  'Others'
] as const;

export type Category = typeof CATEGORIES[number];

