import { database } from '../src/db/connection';

type Rule = {
  label: string;
  regex: RegExp;
  category: string;
};

const RULES: Rule[] = [
  {
    label: 'Fresh fruits',
    regex: /\b(apple|banana|mango|orange|grape|berry|berries|watermelon|papaya|pineapple|kiwi|melon|pomegranate|guava|coconut|tender\s*coconut|fruit|fruits)\b/i,
    category: 'Fresh Produce – Fruits'
  },
  {
    label: 'Fresh vegetables and herbs',
    regex: /\b(onion|tomato|potato|carrot|capsicum|bell\s*pepper|cabbage|cauliflower|spinach|palak|methi|fenugreek|beans|beans\s*haricot|okra|lady\s*finger|pea|peas|ginger|garlic|chilli|green\s*chilli|chilli\s*green|mushroom|brinjal|lemon|drumsticks?|beetroot|fresh\s*produce|vegetable|vegetables|leafy\s*vegetable|leaves|herb|herbs)\b/i,
    category: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    label: 'Staples and pantry items',
    regex: /\b(rice|sonamasuri|poha|atta|flour|sooji|maida|dal|lentil|pulses|grain|grains|cereal|wheat|rice\s*flour|gram\s*flour|kabuli\s*chana|kala\s*chana|chana|besan|pulse|peanut|groundnut|singdana|oil|sunflower\s*oil|refined\s*oil|groundnut\s*oil|edible\s*oil|ghee|sugar|salt|jaggery)\b/i,
    category: 'Staples & Pantry'
  },
  {
    label: 'Spices, condiments and cooking essentials',
    regex: /^(?!.*\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b).*?\b(spice|spices|jeera|cumin|masala|masalas|salt|pepper|seasoning|manchurian|gravy\s*mix|sauce|soy\s*sauce|green\s*chilli\s*sauce|red\s*chilli\s*sauce|pickl(e|es)|pickle|pickle\s*jar|condiment|chutney|paste|ginger\s*garlic\s*paste)\b/i,
    category: 'Spices, Condiments & Cooking Essentials'
  },
  {
    label: 'Dairy and eggs',
    regex:
      /^(?!.*\b(ice\s*cream|ice-cream|icecream|cornetto|popsicle|frozen\s*dessert|frozen|cone|choco|chocolate|wafer|lindt|lindor|kitkat|munch|dukes|waffy|flavoured\s*milk|kool|cafe|coffee)\b).*?\b(milk|dairy|curd|yogurt|yoghurt|paneer|cheese|butter|cream|ghee|dahi|lassi|buttermilk|condensed\s*milk|milk\s*powder)\b/i,
    category: 'Dairy & Eggs'
  },
  {
    label: 'Bakery and bread',
    regex: /\b(bread|pav|paav|bun|buns|croissant|bagel|bun\s*mask(a)?|pastry|bakery|loaf|roll(?![-\s]*on)\b|rolls)\b/i,
    category: 'Bakery & Bread'
  },
  {
    label: 'Snacks and salty snacks',
    regex:
      /^(?!.*\b(choco|chocolate|wafer\s*bar|choco\s*coated|lindt|lindor|kitkat|dukes|waffy)\b).*?\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b/i,
    category: 'Snacks & Salty Snacks'
  },
  {
    label: 'Confectionery and sweet tooth',
    regex:
      /^(?!.*\b(cone)\b).*?\b(choco|chocolate|chocolates|candy|bubble\s*gum|gum|sweets?|dessert|lindt|lindor|kitkat|nestle\s*munch|dukes|waffy|cookie|cookies|biscuit|biscuits|wafer|wafers|waffle|croissant|cake|sweet\s*snack|sweet)\b/i,
    category: 'Confectionery & Sweet Tooth'
  },
  {
    label: 'Frozen and refrigerated items',
    regex: /\b(ice\s*cream|ice\-cream|icecream|cornetto|popsicle|frozen\s*dessert|frozen|frozen\s*food|cone)\b/i,
    category: 'Frozen & Refrigerated Items'
  },
  {
    label: 'Instant and ready-to-cook foods',
    regex: /\b(maggi|noodle|noodles|instant\s*(meal|meals|food|foods)|ramen|cup\s*noodles|ready[-\s]*to[-\s]*eat|ready[-\s]*to[-\s]*cook|batter|meal\s*kit)\b/i,
    category: 'Instant & Ready-to-Cook Foods'
  },
  {
    label: 'Beverages and drinks',
    regex:
      /^(?!.*\b(instant\s*coffee|coffee\s*powder)\b).*?\b(juice|fruit\s*juice|soft\s*drink|cola|soda|mineral\s*water|bottled\s*water|cold\s*drink|drink|beverage|energy\s*drink|tea|coffee|chai|tea\s*bag|milk\s*drink|flavoured\s*milk|health\s*drink)\b/i,
    category: 'Beverages & Drinks'
  },
  {
    label: 'Tobacco and related products',
    regex: /\b(cigarette|tobacco|cigar|pan|paan|supari|smoke|hookah|chewing\s*tobacco|rolling\s*paper|lighter|classic\s*(?:refined\s*taste|ultra\s*mild)|\bGold\s*Flake\b|\bMarlboro\b|\bWills\b|\bPlayers\b|\bStellar\s*Define\b|\bMagnate\b|\bMagic\s*Switch\b)\b/i,
    category: 'Tobacco & Related'
  },
  {
    label: 'Household, personal care and miscellaneous',
    regex: /\b(bouquet|flowers?|gift|hygiene|cleaning|soap|detergent|shampoo|toothpaste|sanitary|pad|tray|tape|bopp\s*tape|packet|box|packaging|wrap|misc|miscellaneous|incense|agarbatti|mangaldeep|facial|o3\+|aroma\s*magic|bottle\s*brush|sponge|gloves?|garbage\s*bags?|science\s*kit|roll[-\s]*on|instant\s*coffee|coffee\s*powder)\b/i,
    category: 'Household, Personal Care & Miscellaneous'
  },
  {
    label: 'Charges and fees',
    regex: /\b(convenience\s*charge|delivery\s*charge|service\s*charge|platform\s*fee|handling\s*charge)\b/i,
    category: 'Charges & Fees'
  }
];

async function run(): Promise<void> {
  await database.connect();
  const invoices = database.invoices;

  const results: { label: string; matched: number; modified: number }[] = [];

  // IMPORTANT:
  // `categorizeDescription()` is first-match-wins (top-to-bottom).
  // This script uses sequential updates, so later updates overwrite earlier ones.
  // To match the parser, apply rules bottom-to-top so the earliest (highest priority)
  // rule in RULES is the last one applied.
  for (const rule of [...RULES].reverse()) {
    const res = await invoices.updateMany(
      { 'items.description': rule.regex },
      {
        $set: { 'items.$[item].category': rule.category }
      },
      {
        arrayFilters: [{ 'item.description': rule.regex }]
      }
    );

    results.push({
      label: rule.label,
      matched: res.matchedCount,
      modified: res.modifiedCount
    });
  }

  console.log('Category migration summary:');
  for (const r of results) {
    console.log(
      `- ${r.label}: matched=${r.matched}, updated=${r.modified}, category="${RULES.find(rule => rule.label === r.label)?.category}"`
    );
  }

  await database.disconnect();
}

run()
  .then(() => {
    console.log('✅ Category migration complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Category migration failed', err);
    process.exit(1);
  });

