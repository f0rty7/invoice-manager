import { categorizeDescription } from '../src/parsers/base.parser';

import { categorizationFixtures } from './categorization-fixtures';

type Failure = {
  description: string;
  expected: string;
  actual: string;
};

function run(): void {
  const failures: Failure[] = [];

  for (const fx of categorizationFixtures) {
    const actual = categorizeDescription(fx.description);
    if (actual !== fx.expected) {
      failures.push({
        description: fx.description,
        expected: fx.expected,
        actual
      });
    }
  }

  if (failures.length) {
    console.error(`❌ Categorization verification failed (${failures.length} case(s))`);
    for (const f of failures) {
      console.error(`- desc="${f.description}" expected="${f.expected}" actual="${f.actual}"`);
    }
    process.exit(1);
  }

  console.log(`✅ Categorization verification passed (${categorizationFixtures.length} case(s))`);
}

run();
