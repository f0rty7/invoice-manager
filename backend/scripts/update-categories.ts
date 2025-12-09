import { database } from '../src/db/connection';

type Rule = {
  label: string;
  regex: RegExp;
  category: string;
};

const RULES: Rule[] = [
  {
    label: 'Fresh fruits',
    regex: /\b(apple|banana|mango|orange|grape|berry|berries|watermelon|papaya|pineapple|kiwi|melon|pomegranate|coconut|tender\s*coconut|fruit|fruits)\b/i,
    category: 'Fresh Produce – Fruits'
  },
  {
    label: 'Fresh vegetables and herbs',
    regex: /\b(onion|tomato|potato|carrot|capsicum|bell\s*pepper|cabbage|cauliflower|spinach|palak|methi|fenugreek|beans|beans\s*haricot|okra|lady\s*finger|pea|peas|ginger|garlic|chilli|green\s*chilli|chilli\s*green|mushroom|fresh\s*produce|vegetable|vegetables|leafy\s*vegetable|leaves|herb|herbs)\b/i,
    category: 'Fresh Produce – Vegetables & Herbs'
  },
  {
    label: 'Staples and pantry items',
    regex: /\b(rice|sonamasuri|poha|atta|flour|sooji|maida|dal|lentil|pulses|grain|grains|cereal|wheat|rice\s*flour|pulse|oil|sunflower\s*oil|refined\s*oil|groundnut\s*oil|edible\s*oil|ghee|sugar|salt|jaggery)\b/i,
    category: 'Staples & Pantry'
  },
  {
    label: 'Spices, condiments and cooking essentials',
    regex: /\b(spice|masala|masalas|salt|pepper|seasoning|sauce|soy\s*sauce|green\s*chilli\s*sauce|red\s*chilli\s*sauce|pickl(e|es)|pickle|pickle\s*jar|condiment|chutney|paste|ginger\s*garlic\s*paste)\b/i,
    category: 'Spices, Condiments & Cooking Essentials'
  },
  {
    label: 'Dairy and eggs',
    regex: /\b(milk|dairy|curd|yogurt|yoghurt|paneer|cheese|butter|cream|ghee|dahi|lassi|buttermilk|condensed\s*milk|milk\s*powder)\b/i,
    category: 'Dairy & Eggs'
  },
  {
    label: 'Bakery and bread',
    regex: /\b(bread|bun|buns|croissant|bagel|bun\s*mask(a)?|pastry|bakery|loaf|roll|rolls)\b/i,
    category: 'Bakery & Bread'
  },
  {
    label: 'Snacks and salty snacks',
    regex: /\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b/i,
    category: 'Snacks & Salty Snacks'
  },
  {
    label: 'Confectionery and sweet tooth',
    regex: /\b(chocolate|chocolates|candy|sweets?|dessert|ice\s*cream|ice\-cream|icecream|cornetto|popsicle|frozen\s*dessert|cookie|cookies|biscuit|biscuits|wafer|waffle|croissant|cake|sweet\s*snack|sweet)\b/i,
    category: 'Confectionery & Sweet Tooth'
  },
  {
    label: 'Frozen and refrigerated items',
    regex: /\b(ice\s*cream|frozen|frozen\s*food|icecream|cornetto|popsicle)\b/i,
    category: 'Frozen & Refrigerated Items'
  },
  {
    label: 'Instant and ready-to-cook foods',
    regex: /\b(maggi|noodle|noodles|instant\s*(meal|meals|food|foods)|ramen|cup\s*noodles|ready[-\s]*to[-\s]*eat|ready[-\s]*to[-\s]*cook|batter|meal\s*kit)\b/i,
    category: 'Instant & Ready-to-Cook Foods'
  },
  {
    label: 'Beverages and drinks',
    regex: /\b(juice|fruit\s*juice|soft\s*drink|cola|soda|mineral\s*water|bottled\s*water|cold\s*drink|drink|beverage|energy\s*drink|tea|coffee|chai|coffee\s*powder|tea\s*bag|milk\s*drink|health\s*drink)\b/i,
    category: 'Beverages & Drinks'
  },
  {
    label: 'Tobacco and related products',
    regex: /\b(cigarette|tobacco|cigar|pan|paan|supari|smoke|hookah|chewing\s*tobacco|rolling\s*paper|lighter|\bGold\s*Flake\b|\bMarlboro\b|\bWills\b|\bPlayers\b|\bStellar\s*Define\b|\bMagnate\b|\bMagic\s*Switch\b)\b/i,
    category: 'Tobacco & Related'
  },
  {
    label: 'Household, personal care and miscellaneous',
    regex: /\b(bouquet|flower|gift|hygiene|cleaning|soap|detergent|shampoo|toothpaste|sanitary|pad|tray|tape|bopp\s*tape|packet|box|packaging|wrap|misc|miscellaneous)\b/i,
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

  for (const rule of RULES) {
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

