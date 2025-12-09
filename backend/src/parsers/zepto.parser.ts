import type { Invoice, InvoiceItem, ParseResult } from '@pdf-invoice/shared';
import { PDFParser, categorizeDescription } from './base.parser';

export class ZeptoParser implements PDFParser {
  canParse(tokens: string[]): boolean {
    // Zepto invoices have "Invoice No.:" header
    return tokens.some(t => t.startsWith('Invoice No.:'));
  }

  parse(tokens: string[]): ParseResult {
    const invoice = this.parseInvoiceFromTokens(tokens);
    return {
      invoices: invoice.items.length > 0 ? [invoice] : []
    };
  }

  private cleanRegisteredName(raw: string | null): string | null {
    if (!raw) return null;
    const withoutParens = raw.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return withoutParens || null;
  }

  private deriveKnownName(registered: string | null): string | null {
    if (!registered) return null;
    const known = registered.replace(/\bprivate\s+limited\b/ig, '').replace(/\s+/g, ' ').trim();
    return known || registered;
  }

  private isHSN(text: string): boolean {
    return /^\d{6,8}$/.test(text.trim());
  }

  private parseInvoiceFromTokens(tokens: string[]): Invoice {
    const invoice: Invoice = {
      invoice_no: null,
      order_no: null,
      date: null,
      delivery_partner: {
        registered_name: null,
        known_name: null
      },
      items: [],
      items_total: null
    };
    
    // Header fields
    for (const t of tokens.slice(0, 40)) {
      if (t.startsWith('Invoice No.:')) {
        invoice.invoice_no = t.split('Invoice No.:')[1].trim() || null;
      } else if (t.startsWith('Order No.:')) {
        invoice.order_no = t.split('Order No.:')[1].trim() || null;
      } else if (t.startsWith('Date')) {
        const m = t.match(/(\d{2}-\d{2}-\d{4})/);
        if (m) invoice.date = m[1];
      }
    }

    // Delivery partner
    const delIdx = tokens.findIndex(t => t.startsWith('Order Delivered From'));
    if (delIdx !== -1) {
      const nameTokens = [];
      for (let j = delIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (/^(No\.|FSSAI:|E-commerce Platform)/.test(t)) break;
        nameTokens.push(t);
      }
      if (nameTokens.length) {
        const rawName = nameTokens.join(' ');
        const registered_name = this.cleanRegisteredName(rawName);
        const known_name = this.deriveKnownName(registered_name);
        invoice.delivery_partner = { registered_name, known_name };
      }
    }
    
    // Find items
    const headerIdx = tokens.findIndex(t => t === 'SR');
    if (headerIdx === -1) return invoice;
    
    let i = tokens.findIndex((t, idx) => idx > headerIdx && /^\d+$/.test(t));
    if (i === -1) return invoice;
    
    while (i < tokens.length) {
      const srToken = tokens[i];
      if (!/^\d+$/.test(srToken)) break;
      const sr = parseInt(srToken, 10);
      i++;
      
      // Collect description
      const descTokens = [];
      while (i < tokens.length && !this.isHSN(tokens[i])) {
        if (/^Item$/i.test(tokens[i]) && /Total/i.test(tokens[i + 1] || '')) {
          return invoice;
        }
        descTokens.push(tokens[i]);
        i++;
      }
      
      if (i >= tokens.length || !this.isHSN(tokens[i])) break;
      const hsn = tokens[i];
      i++;
      
      if (i >= tokens.length) break;
      const qty = parseFloat(tokens[i]);
      if (Number.isNaN(qty)) break;
      i++;
      
      const numFrom = (t: string) => {
        const n = parseFloat(t.replace(/[^\d.]/g, ''));
        return Number.isNaN(n) ? null : n;
      };
      
      if (i + 10 >= tokens.length) break;
      
      const rateToken = tokens[i++];
      i += 9;
      const totalToken = tokens[i++];
      
      const unit_price = numFrom(rateToken);
      const price = numFrom(totalToken);
      const description = descTokens.join(' ');
      const category = categorizeDescription(description);
      
      invoice.items.push({
        sr,
        description,
        qty,
        unit_price,
        price,
        category
      });
      
      if (i >= tokens.length) break;
      if (/^Item$/i.test(tokens[i]) || /^Invoice$/i.test(tokens[i])) break;
    }
    
    // Compute total
    const sum = invoice.items
      .map(it => it.price)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
      .reduce((a, b) => a + b, 0);
    invoice.items_total = sum || null;
    
    return invoice;
  }
}

export const zeptoParser = new ZeptoParser();

