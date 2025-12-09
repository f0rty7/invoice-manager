import { database } from '../src/db/connection';

type Rule = {
  label: string;
  regex: RegExp;
  category: string;
};

const RULES: Rule[] = [
  {
    label: 'Croissant / Britannia Treat / Wafy / Wafers',
    regex: /\b(croissant|britannia treat|wafy|wafer|wafers)\b/i,
    category: 'Savories | Sweet Tooth'
  },
  {
    label: 'Magnate Magic Switch King Size',
    regex: /\bmagnate.*magic\s*switch.*king\s*size\b/i,
    category: 'Tobacco'
  },
  {
    label: 'Mango',
    regex: /\bmango(es)?\b/i,
    category: 'Fruits'
  },
  {
    label: 'Pickle',
    regex: /\bpickle(s)?\b/i,
    category: 'Groceries'
  },
  {
    label: 'Maggi / Instant noodles',
    regex: /\b(maggi|instant\s*noodle|noodles|cup\s*noodles|ramen)\b/i,
    category: 'Instant foods'
  },
  {
    label: 'Tender coconut',
    regex: /\btender\s*coconut|coconut\s*water|nariyal\s*pani\b/i,
    category: 'Refreshments'
  },
  {
    label: 'Convenience charge',
    regex: /\b(convenience\s*charge|delivery\s*charge|service\s*charge|platform\s*fee|handling\s*charge)\b/i,
    category: 'Charges'
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

