import { database } from '../src/db/connection';

function parseDDMMYYYY(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr.trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return d;
}

async function run(): Promise<void> {
  await database.connect();
  const invoices = database.invoices;

  // Only update docs missing either field (or with null date_obj).
  const cursor = invoices.find({
    $or: [
      { date_obj: { $exists: false } },
      { date_obj: null },
      { items_count: { $exists: false } },
    ]
  }, { projection: { _id: 1, date: 1, items: 1 } as any });

  let scanned = 0;
  let updated = 0;

  for await (const inv of cursor as any) {
    scanned += 1;
    const date_obj = parseDDMMYYYY(inv.date ?? null);
    const items_count = Array.isArray(inv.items) ? inv.items.length : 0;

    const res = await invoices.updateOne(
      { _id: inv._id } as any,
      { $set: { date_obj, items_count } }
    );
    if (res.modifiedCount > 0) updated += 1;

    if (scanned % 500 === 0) {
      console.log(`Progress: scanned=${scanned}, updated=${updated}`);
    }
  }

  console.log(`Backfill complete: scanned=${scanned}, updated=${updated}`);
  await database.disconnect();
}

run()
  .then(() => {
    console.log('✅ Invoice fields backfill complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Invoice fields backfill failed', err);
    process.exit(1);
  });

/**
 * Backfill script to populate date_obj and items_count for existing invoices
 * 
 * Run this script once after deploying the new version to update existing data:
 *   npx ts-node scripts/backfill-invoice-fields.ts
 * 
 * Or add to package.json scripts and run:
 *   npm run backfill
 */

import { MongoClient } from 'mongodb';
import { CONFIG } from '../src/config';

async function backfillInvoiceFields() {
  console.log('Starting backfill of date_obj and items_count fields...');
  
  const client = new MongoClient(CONFIG.mongodb.uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(CONFIG.mongodb.dbName);
    const invoices = db.collection('invoices');
    
    // Count documents that need updating
    const needsUpdate = await invoices.countDocuments({
      $or: [
        { date_obj: { $exists: false } },
        { items_count: { $exists: false } }
      ]
    });
    
    console.log(`Found ${needsUpdate} invoices that need updating`);
    
    if (needsUpdate === 0) {
      console.log('No invoices to update. Backfill complete.');
      return;
    }
    
    // Use aggregation pipeline update to set date_obj and items_count
    const result = await invoices.updateMany(
      {
        $or: [
          { date_obj: { $exists: false } },
          { items_count: { $exists: false } }
        ]
      },
      [
        {
          $set: {
            // Parse DD-MM-YYYY date string to Date object
            date_obj: {
              $cond: {
                if: { $and: [{ $ne: ['$date', null] }, { $ne: ['$date', ''] }] },
                then: {
                  $dateFromString: {
                    dateString: '$date',
                    format: '%d-%m-%Y',
                    onError: null,
                    onNull: null
                  }
                },
                else: null
              }
            },
            // Compute items count
            items_count: {
              $size: { $ifNull: ['$items', []] }
            }
          }
        }
      ]
    );
    
    console.log(`Updated ${result.modifiedCount} invoices`);
    console.log('Backfill complete!');
    
    // Verify the update
    const stillNeedsUpdate = await invoices.countDocuments({
      $or: [
        { date_obj: { $exists: false } },
        { items_count: { $exists: false } }
      ]
    });
    
    if (stillNeedsUpdate > 0) {
      console.warn(`Warning: ${stillNeedsUpdate} invoices still need updating`);
    } else {
      console.log('All invoices have been updated successfully');
    }
    
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the backfill
backfillInvoiceFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });

