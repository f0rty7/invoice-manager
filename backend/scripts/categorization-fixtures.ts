import type { Category } from '@pdf-invoice/shared';

export type CategorizationFixture = {
  description: string;
  expected: Category;
};

// Canonical fixtures from the user list.
// Note: #15 and #24 were duplicates, so included once.
export const categorizationFixtures: CategorizationFixture[] = [
  // Regression fixtures for previously-misclassified real descriptions
  {
    description: 'Thai Guava(Pack)',
    expected: 'Fresh Produce – Fruits'
  },
  {
    description: 'Britannia Pav 1 pack (200 g)',
    expected: 'Bakery & Bread'
  },
  {
    description: 'Daily Good Raw Peanut / Singdana 1 pack (500 g)',
    expected: 'Staples & Pantry'
  },
  {
    description: 'Tata Sampann Cumin Seed (Jeera) | Whole Spices, Natural Oils with Rich Aroma 1 pack (100 g)',
    expected: 'Spices, Condiments & Cooking Essentials'
  },
  {
    description: 'Knorr Chinese Manchurian Gravy Mix 1 pack (55 g)',
    expected: 'Spices, Condiments & Cooking Essentials'
  },
  {
    description: 'Purple Chrysanthemum Flowers',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Smartivity My First Science Kit[SMRT1276]',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Lemon',
    expected: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    description: 'Kabuli Chana',
    expected: 'Staples & Pantry'
  },
  {
    description: 'Besan',
    expected: 'Staples & Pantry'
  },
  {
    description: 'Drumsticks',
    expected: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    description: 'Beetroot',
    expected: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    description: 'Hangyo Black Current Cone',
    expected: 'Frozen & Refrigerated Items'
  },
  {
    description: 'Classic Refined Taste',
    expected: 'Tobacco & Related'
  },
  {
    description: 'Mangaldeep Treya 3 in 1 Incense Sticks',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'O3+ Shine & Glow Facial Kit',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Gebi Bottle Brush With Sponge',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Boomer Krunch Strawberry Flavour Bubble Gum Tube',
    expected: 'Confectionery & Sweet Tooth'
  },
  {
    description: 'Se7en Heavy Duty Reusable Household Hand Gloves',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Ezee Small Garbage Bags',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Continental Xtra Instant Coffee 1 pack',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Kurkure Masala Munch Crisps (Pack)',
    expected: 'Snacks & Salty Snacks'
  },
  {
    description: 'Lindt Lindor Smooth Melting Milk Chocolate Cornet Trio',
    expected: 'Confectionery & Sweet Tooth'
  },
  {
    description: 'Dairy Day Blackcurrant Ice Cream Cone 1 pc',
    expected: 'Frozen & Refrigerated Items'
  },
  {
    description: 'Dairy Day Butterscotch Ice Cream Cone 1 pc',
    expected: 'Frozen & Refrigerated Items'
  },
  {
    description: 'Cream Bell Maxxum Choco Brownie Cone',
    expected: 'Frozen & Refrigerated Items'
  },
  {
    description: "Amul Kool Cafe Milk 'n' Coffee Flavoured Milk",
    expected: 'Beverages & Drinks'
  },
  {
    description: 'Amrutanjan Faster Relaxation Roll-On',
    expected: 'Household, Personal Care & Miscellaneous'
  },
  {
    description: 'Nestle KitKat Minis Choco Coated Wafer Bar Share Bag Miniature Pouch',
    expected: 'Confectionery & Sweet Tooth'
  },
  {
    description: 'Dukes Waffy Chocolate Wafers',
    expected: 'Confectionery & Sweet Tooth'
  }
];
