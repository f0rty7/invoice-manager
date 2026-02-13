import { database } from '../src/db/connection';
import { CATEGORIES } from '../src/parsers/base.parser';

async function run(): Promise<void> {
  await database.connect();
  const invoices = database.invoices;

  // Filter out the catch-all fallback rule (matches everything)
  const rules = CATEGORIES.filter(rule => rule.category !== 'Others');

  const results: { category: string; matched: number; modified: number }[] = [];

  // IMPORTANT:
  // `categorizeDescription()` is first-match-wins (top-to-bottom).
  // This script uses sequential updates, so later updates overwrite earlier ones.
  // To match the parser, apply rules bottom-to-top so the earliest (highest priority)
  // rule in CATEGORIES is the last one applied.
  for (const rule of [...rules].reverse()) {
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
      category: rule.category,
      matched: res.matchedCount,
      modified: res.modifiedCount
    });
  }

  console.log('Category migration summary:');
  for (const r of results) {
    console.log(
      `- ${r.category}: matched=${r.matched}, updated=${r.modified}`
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
