import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Document } from 'mongodb';
import { CONFIG } from '../config';
import { database } from '../db/connection';
import { pdfParserService } from './pdf-parser.service';
import { invoiceService } from './invoice.service';

type ImportedFileStatus = 'processing' | 'processed' | 'failed';

interface ImportedFileDoc extends Document {
  path: string;
  fingerprint: string; // `${size}:${mtimeMs}`
  status: ImportedFileStatus;
  inserted?: number;
  error?: string;
  user_id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
}

async function walkDir(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    // Skip symlinks to avoid accidental loops.
    if (entry.isSymbolicLink()) continue;

    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      out.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

export class InvoiceImportService {
  private resolveImportDir(): string {
    const override = CONFIG.invoiceImport.dir;
    if (override) return path.resolve(override);

    // NOTE: backend is typically started from the `backend/` folder (root scripts do `cd backend`),
    // so `../invoice-sync` points at repo-root `invoice-sync/`.
    return path.resolve(process.cwd(), '../invoice-sync');
  }

  async syncOnce(): Promise<void> {
    if (!CONFIG.invoiceImport.enabled) return;

    const runStartedAt = Date.now();

    const importDir = this.resolveImportDir();
    console.log(
      `[invoice-import] Starting sync at ${importDir} for username=${CONFIG.invoiceImport.username}`
    );

    const importUser = await database.users.findOne(
      { username: CONFIG.invoiceImport.username },
      { projection: { _id: 1, username: 1 } }
    );

    if (!importUser?._id) {
      console.warn(
        `[invoice-import] User "${CONFIG.invoiceImport.username}" not found. ` +
          'Skipping startup invoice import.'
      );
      return;
    }

    try {
      const s = await stat(importDir);
      if (!s.isDirectory()) {
        console.warn(`[invoice-import] Import path is not a directory: ${importDir}`);
        return;
      }
    } catch {
      console.warn(`[invoice-import] Import directory not found: ${importDir}`);
      return;
    }

    const allPaths = await walkDir(importDir);
    const pdfPaths = allPaths.filter(p => path.extname(p).toLowerCase() === '.pdf');

    if (!pdfPaths.length) {
      console.log(`[invoice-import] No PDFs found in ${importDir}`);
      return;
    }

    const stats = {
      total_files_scanned: allPaths.length,
      total_pdfs_found: pdfPaths.length,
      claimed_new_or_changed: 0,
      skipped_already_processed: 0,
      processed_ok: 0,
      processed_failed: 0,
      total_invoices_upserted: 0,
    };

    console.log(
      `[invoice-import] Found ${stats.total_pdfs_found} PDF(s) in ${importDir} (files_scanned=${stats.total_files_scanned})`
    );

    const importedFiles = database.collection<ImportedFileDoc>('imported_files');

    for (const rawPath of pdfPaths) {
      const filePath = path.resolve(rawPath);
      const now = new Date();

      let st: Awaited<ReturnType<typeof stat>>;
      try {
        st = await stat(filePath);
      } catch {
        continue;
      }

      const fingerprint = `${st.size}:${st.mtimeMs}`;

      // Claim (path,fingerprint). If it's already present, it's already processed (or at least seen).
      const claim = await importedFiles.updateOne(
        { path: filePath, fingerprint },
        {
          $setOnInsert: {
            path: filePath,
            fingerprint,
            status: 'processing',
            user_id: importUser._id.toString(),
            username: importUser.username,
            created_at: now,
            updated_at: now,
          },
        },
        { upsert: true }
      );

      if (claim.upsertedCount === 0) {
        stats.skipped_already_processed += 1;
        console.log(`[invoice-import] SKIP path=${filePath} fingerprint=${fingerprint}`);
        continue;
      }

      stats.claimed_new_or_changed += 1;

      const fileStartedAt = Date.now();

      try {
        const parseResult = await pdfParserService.parsePDFFile(filePath);
        const inserted = await invoiceService.bulkInsert(
          parseResult.invoices,
          importUser._id.toString(),
          importUser.username
        );

        stats.processed_ok += 1;
        stats.total_invoices_upserted += inserted;
        const durationMs = Date.now() - fileStartedAt;
        console.log(
          `[invoice-import] IMPORT_OK path=${filePath} fingerprint=${fingerprint} inserted=${inserted} duration_ms=${durationMs}`
        );

        await importedFiles.updateOne(
          { path: filePath, fingerprint },
          {
            $set: {
              status: 'processed',
              inserted,
              processed_at: new Date(),
              updated_at: new Date(),
            },
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stats.processed_failed += 1;
        const durationMs = Date.now() - fileStartedAt;
        console.warn(
          `[invoice-import] IMPORT_FAIL path=${filePath} fingerprint=${fingerprint} error=${message} duration_ms=${durationMs}`
        );
        await importedFiles.updateOne(
          { path: filePath, fingerprint },
          {
            $set: {
              status: 'failed',
              error: message,
              processed_at: new Date(),
              updated_at: new Date(),
            },
          }
        );
      }
    }

    const runDurationMs = Date.now() - runStartedAt;
    console.log(
      `[invoice-import] Summary ` +
        `files_scanned=${stats.total_files_scanned} ` +
        `pdfs_found=${stats.total_pdfs_found} ` +
        `claimed=${stats.claimed_new_or_changed} ` +
        `skipped=${stats.skipped_already_processed} ` +
        `ok=${stats.processed_ok} ` +
        `failed=${stats.processed_failed} ` +
        `invoices_upserted=${stats.total_invoices_upserted} ` +
        `duration_ms=${runDurationMs}`
    );
  }
}

export const invoiceImportService = new InvoiceImportService();


