import type { Invoice, InvoiceItem, DeliveryPartner, ParseResult } from '@pdf-invoice/shared';

export interface PDFParser {
  canParse(tokens: string[]): boolean;
  parse(tokens: string[]): ParseResult;
}

export const CATEGORIES = [
  {
    // Fresh fruits (fresh produce)
    regex: /\b(apple|banana|mango|orange|grape|berry|berries|watermelon|papaya|pineapple|kiwi|melon|pomegranate|coconut|tender\s*coconut|fruit|fruits)\b/i,
    category: 'Fresh Produce – Fruits'
  },
  {
    // Fresh vegetables, herbs, fresh produce, root-veg, leafy, etc.
    regex: /\b(onion|tomato|potato|carrot|capsicum|bell\s*pepper|cabbage|cauliflower|spinach|palak|methi|fenugreek|beans|beans\s*haricot|okra|lady\s*finger|pea|peas|ginger|garlic|chilli|green\s*chilli|chilli\s*green|mushroom|brinjal|lemon|drumsticks?|beetroot|fresh\s*produce|vegetable|vegetables|leafy\s*vegetable|leaves|herb|herbs)\b/i,
    category: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    // Staples: rice, flour/atta/sooji/poha/pulses/grains, cooking essentials like cooking oil
    regex: /\b(rice|sonamasuri|poha|atta|flour|sooji|maida|dal|lentil|pulses|grain|grains|cereal|wheat|rice\s*flour|gram\s*flour|kabuli\s*chana|kala\s*chana|chana|besan|pulse|oil|sunflower\s*oil|refined\s*oil|groundnut\s*oil|edible\s*oil|ghee|sugar|salt|jaggery)\b/i,
    category: 'Staples & Pantry'
  },
  {
    // Spices, condiments, sauces, pickles, masalas, cooking flavour / condiments
    regex: /^(?!.*\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b).*?\b(spice|masala|masalas|salt|pepper|seasoning|sauce|soy\s*sauce|green\s*chilli\s*sauce|red\s*chilli\s*sauce|pickl(e|es)|pickle|pickle\s*jar|condiment|chutney|paste|ginger\s*garlic\s*paste)\b/i,
    category: 'Spices, Condiments & Cooking Essentials'
  },
  {
    // Dairy products & eggs & related — milk, butter, yogurt/curd, paneer/cheese, cream, ghee etc.
    regex:
      /^(?!.*\b(ice\s*cream|ice-cream|icecream|cornetto|popsicle|frozen\s*dessert|frozen|cone|choco|chocolate|wafer|lindt|lindor|kitkat|munch|dukes|waffy|flavoured\s*milk|kool|cafe|coffee)\b).*?\b(milk|dairy|curd|yogurt|yoghurt|paneer|cheese|butter|cream|ghee|dahi|lassi|buttermilk|condensed\s*milk|milk\s*powder)\b/i,
    category: 'Dairy & Eggs'
  },
  {
    // Bakery and bread goods: bread, buns, croissants, bakery items
    regex: /\b(bread|bun|buns|croissant|bagel|bun\s*mask(a)?|pastry|bakery|loaf|roll(?![-\s]*on)\b|rolls)\b/i,
    category: 'Bakery & Bread'
  },
  {
    // Snacks — salty / savoury snacks (chips, namkeen, crackers, salted snacks)
    regex:
      /^(?!.*\b(choco|chocolate|wafer\s*bar|choco\s*coated|lindt|lindor|kitkat|dukes|waffy)\b).*?\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b/i,
    category: 'Snacks & Salty Snacks'
  },
  {
    // Confectionery, sweets, chocolates, desserts, biscuity sweet snacks
    regex:
      /^(?!.*\b(cone)\b).*?\b(choco|chocolate|chocolates|candy|bubble\s*gum|gum|sweets?|dessert|lindt|lindor|kitkat|nestle\s*munch|dukes|waffy|cookie|cookies|biscuit|biscuits|wafer|wafers|waffle|croissant|cake|sweet\s*snack|sweet)\b/i,
    category: 'Confectionery & Sweet Tooth'
  },
  {
    // Frozen & refrigerated desserts / frozen items (ice-cream, frozen food)
    regex: /\b(ice\s*cream|ice\-cream|icecream|cornetto|popsicle|frozen\s*dessert|frozen|frozen\s*food|cone)\b/i,
    category: 'Frozen & Refrigerated Items'
  },
  {
    // Instant / ready-to-eat / ready-to-cook foods (quick meals, noodles, batters, meal kits)
    regex: /\b(maggi|noodle|noodles|instant\s*(meal|meals|food|foods)|ramen|cup\s*noodles|ready[-\s]*to[-\s]*eat|ready[-\s]*to[-\s]*cook|batter|meal\s*kit)\b/i,
    category: 'Instant & Ready-to-Cook Foods'
  },
  {
    // Beverages: soft drinks, soda, energy drinks, tea/coffee, bottled / canned drinks
    regex:
      /^(?!.*\b(instant\s*coffee|coffee\s*powder)\b).*?\b(juice|fruit\s*juice|soft\s*drink|cola|soda|mineral\s*water|bottled\s*water|cold\s*drink|drink|beverage|energy\s*drink|tea|coffee|chai|tea\s*bag|milk\s*drink|flavoured\s*milk|health\s*drink)\b/i,
    category: 'Beverages & Drinks'
  },
  {
    // Tobacco & related: cigarettes, pan/paan, chewing tobacco, hookah, tobacco-products
    regex: /\b(cigarette|tobacco|cigar|pan|paan|supari|smoke|hookah|chewing\s*tobacco|rolling\s*paper|lighter|classic\s*(?:refined\s*taste|ultra\s*mild)|\bGold\s*Flake\b|\bMarlboro\b|\bWills\b|\bPlayers\b|\bStellar\s*Define\b|\bMagnate\b|\bMagic\s*Switch\b)\b/i,
    category: 'Tobacco & Related'
  },
  {
    // Non-food: household items, personal care, gift items, non-edible products — includes other misc items
    regex: /\b(bouquet|flower|gift|hygiene|cleaning|soap|detergent|shampoo|toothpaste|sanitary|pad|tray|tape|bopp\s*tape|packet|box|packaging|wrap|misc|miscellaneous|incense|agarbatti|mangaldeep|facial|o3\+|aroma\s*magic|bottle\s*brush|sponge|gloves?|garbage\s*bags?|roll[-\s]*on|instant\s*coffee|coffee\s*powder)\b/i,
    category: 'Household, Personal Care & Miscellaneous'
  },
  {
    // Charges / fees
    regex: /\b(convenience\s*charge|delivery\s*charge|service\s*charge|platform\s*fee|handling\s*charge)\b/i,
    category: 'Charges & Fees'
  },
  {
    // Fallback default
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

