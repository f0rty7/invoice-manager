// Re-export all types
export * from './types';

// Export category list
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
  'Others'
] as const;

export type Category = typeof CATEGORIES[number];

