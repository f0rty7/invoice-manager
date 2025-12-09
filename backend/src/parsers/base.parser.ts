import type { Invoice, InvoiceItem, DeliveryPartner, ParseResult } from '@pdf-invoice/shared';

export interface PDFParser {
  canParse(tokens: string[]): boolean;
  parse(tokens: string[]): ParseResult;
}

export const CATEGORIES = [
  {
    regex: /\b(cigarette|tobacco|cigar|vape|hookah|pan|paan|supari|stellar define|chewing tobacco|rolling paper|lighter|smoke|\bGold\s*Flake\b|\bWills\s*(?:Classic|Navy\s*Cut)\b|\bClassic\b|\bNavy\s*Cut\b|\bFour\s*Square\b|\bBenson\s*&\s*Hedges\b|\bMarlboro\b|\bBristol\b|\bInsignia\b|\bPlayers\b|\bScissors\b|\bCapstan\b|\bBerkeley\b|\bRed\s*&\s*White\b)\b/i,
    category: 'Tobacco'
  },
  {
    regex: /\b(chip|chips|nacho|kurkure|lays|bingo|pringles|doritos|namkeen|bhujia|mixture|sev|popcorn|makhana|cracker|snack|packaged snack)\b/i,
    category: 'Snacks & Munchies'
  },
  {
    regex: /\b(chocolate|candy|sweet|sweets|mithai|barfi|ladoo|pedha|halwa|dessert|ice cream|ice-cream|icecream|cornetto|popsicle|frozen dessert|cookie|biscuit|wafer|cake|pastry|sweet snack)\b/i,
    category: 'Savories | Sweet Tooth'
  },
  {
    regex: /\b(milk|curd|yogurt|dahi|paneer|cheese|butter|cream|margarine|lassi|buttermilk|ghee|milk powder|condensed milk)\b/i,
    category: 'Dairy'
  },
  {
    regex: /\b(juice|fruit juice|soft drink|cola|soda|mineral water|water bottle|cold drink|drink|energy drink|tea|coffee|chai|tea bag|green tea|coffee powder|health drink|malt drink|beverage)\b/i,
    category: 'Beverages'
  },
  {
    regex: /\b(onion|beetroot|leaves|leaf|potato|tomato|ginger|garlic|chilli|lemon|coriander|spinach|palak|carrot|cauliflower|cabbage|cucumber|capsicum|gourd|okra|bhindi|brinjal|mushroom|peas|beans|vegetable|vegetables|fresh produce|rice|dal|pulse|lady finger|methi|fenugreek|idli|dosa|batter|lentil|flour|atta|sooji|besan|maida|sugar|salt|jaggery|poha|grain|grains|oil|ghee|groundnut|peanut)\b/i,
    category: 'Groceries'
  },
  {
    regex: /.*/i,
    category: 'Others'
  }
];

export function categorizeDescription(description: string): string {
  const text = (description || '').toLowerCase();
  for (const rule of CATEGORIES) {
    if (rule.regex.test(text)) {
      return rule.category;
    }
  }
  return 'Others';
}

