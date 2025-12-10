import type { Invoice, InvoiceItem, ParseResult } from '@pdf-invoice/shared';
import { PDFParser, categorizeDescription } from './base.parser';

export class BlinkitParser implements PDFParser {
  canParse(tokens: string[]): boolean {
    // Blinkit invoices have "Tax Invoice" header
    return tokens.some(t => t === 'Tax Invoice');
  }

  parse(tokens: string[]): ParseResult {
    const invoices = this.parseAllInvoices(tokens);
    const merged = this.mergeAll(invoices, tokens);
    return {
      invoices: merged ? [merged] : []
    };
  }

  private numFrom(token: string | null): number | null {
    if (!token) return null;
    const n = parseFloat(String(token).replace(/[^\d.-]/g, ''));
    return Number.isNaN(n) ? null : n;
  }

  private normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    
    const mAlpha = trimmed.match(/^(\d{1,2})[-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[-/](\d{2,4})/i);
    if (mAlpha) {
      const [_, d, mon, y] = mAlpha;
      const monthMap: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
      };
      const mm = monthMap[mon.toLowerCase()];
      const yyyy = y.length === 2 ? `20${y}` : y.padStart(4, '0');
      const dd = d.padStart(2, '0');
      return `${dd}-${String(mm).padStart(2, '0')}-${yyyy}`;
    }
    
    const mNum = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (mNum) {
      const dd = mNum[1].padStart(2, '0');
      const mm = mNum[2].padStart(2, '0');
      const yyyy = mNum[3].length === 2 ? `20${mNum[3]}` : mNum[3].padStart(4, '0');
      return `${dd}-${mm}-${yyyy}`;
    }
    
    return trimmed;
  }

  private matchesPattern(tokens: string[], i: number, pattern: string[]): boolean {
    for (let k = 0; k < pattern.length; k++) {
      if (!tokens[i + k] || tokens[i + k].toLowerCase() !== pattern[k].toLowerCase()) return false;
    }
    return true;
  }

  private findValueAfter(tokens: string[], pattern: string[]): string | null {
    for (let i = 0; i < tokens.length; i++) {
      if (this.matchesPattern(tokens, i, pattern)) {
        let j = i + pattern.length;
        if (tokens[j] === ':') j++;
        return tokens[j] || null;
      }
    }
    return null;
  }

  private findValueByLabel(tokens: string[], regex: RegExp): string | null {
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (regex.test(t)) {
        const parts = t.split(':');
        if (parts.length > 1 && parts[1].trim()) return parts.slice(1).join(':').trim();
        const next = tokens[i + 1] === ':' ? tokens[i + 2] : tokens[i + 1];
        if (next) return next;
      }
    }
    return null;
  }

  private parseHeader(tokens: string[], limitIdx: number): Partial<Invoice> {
    const windowTokens = tokens.slice(0, limitIdx);
    
    const invoice_no =
      this.findValueByLabel(windowTokens, /invoice\s*number/i) ||
      this.findValueAfter(windowTokens, ['Invoice', 'Number']);
    const order_id =
      this.findValueByLabel(windowTokens, /order\s*id/i) ||
      this.findValueAfter(windowTokens, ['Order', 'Id']);
    const invoice_date =
      this.findValueByLabel(windowTokens, /invoice\s*date/i) ||
      this.findValueAfter(windowTokens, ['Invoice', 'Date']);
    
    const delivery_partner = {
      registered_name: 'Blink Commerce Private Limited (formerly known as Grofers India Private Limited)',
      known_name: 'Blinkit'
    };
    
    return {
      invoice_no,
      order_no: order_id,
      date: this.normalizeDate(invoice_date),
      delivery_partner
    };
  }

  private parseItems(tokens: string[], srIdx: number, hasUPC: boolean): InvoiceItem[] {
    let i = srIdx + 1;
    while (i < tokens.length && !/^\d+$/.test(tokens[i])) i++;
    
    const items: InvoiceItem[] = [];
    while (i < tokens.length) {
      if (tokens[i] === 'Total') break;
      if (!/^\d+$/.test(tokens[i])) {
        i++;
        continue;
      }
      
      const sr = parseInt(tokens[i], 10);
      i++;
      
      if (hasUPC) {
        const upcTokens = [];
        while (i < tokens.length && /^\d+$/.test(tokens[i])) {
          upcTokens.push(tokens[i]);
          i++;
        }
      }
      
      const descTokens = [];
      while (i < tokens.length) {
        const tok = tokens[i];
        if (tok === 'Total') break;
        
        const numeric = this.numFrom(tok);
        const isPureNumber = /^-?\d+(?:\.\d+)?$/.test(tok);
        if (numeric !== null && isPureNumber) break;
        
        descTokens.push(tok);
        i++;
      }
      
      const expectedNumeric = hasUPC ? 11 : 10;
      const numericTokens: number[] = [];
      while (i < tokens.length && numericTokens.length < expectedNumeric) {
        const val = this.numFrom(tokens[i]);
        if (val === null) break;
        numericTokens.push(val);
        i++;
      }
      
      if (numericTokens.length < expectedNumeric - 1) break;
      
      const [
        mrp,
        discount,
        qty,
        taxable_value,
        cgst_rate,
        cgst_amt,
        sgst_rate,
        sgst_amt,
        cess_rate,
        additional_cess,
        price
      ] = hasUPC
        ? numericTokens
        : [
            numericTokens[0],
            numericTokens[1],
            numericTokens[2],
            numericTokens[3],
            numericTokens[4],
            numericTokens[5],
            numericTokens[6],
            numericTokens[7],
            0,
            0,
            numericTokens[8]
          ];
      
      const description = descTokens
        .join(' ')
        .replace(/\s*\(HSN[^)]*\)/ig, '')
        .replace(/\bHSN-?\s*\d{6,8}\b/ig, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      const unit_price =
        typeof price === 'number' && typeof qty === 'number' && qty
          ? price / qty
          : mrp || price;
      
      items.push({
        sr,
        description,
        qty,
        unit_price,
        price,
        category: categorizeDescription(description)
      });
    }
    
    return items;
  }

  private parseInvoiceChunk(chunkTokens: string[]): Invoice | null {
    const srIdx = chunkTokens.indexOf('Sr. no');
    if (srIdx === -1) return null;
    
    const hasUPC = (chunkTokens[srIdx + 1] || '').toLowerCase().includes('upc');
    const header = this.parseHeader(chunkTokens, srIdx);
    const items = this.parseItems(chunkTokens, srIdx, hasUPC);
    
    const items_total = items
      .map(it => it.price)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
      .reduce((a, b) => a + b, 0);
    
    return {
      ...header,
      items,
      items_total: items_total || null
    } as Invoice;
  }

  private parseAllInvoices(tokens: string[]): Invoice[] {
    const invoices: Invoice[] = [];
    let start = 0;
    
    while (start < tokens.length) {
      const taxIdx = tokens.indexOf('Tax Invoice', start);
      if (taxIdx === -1) break;
      const nextTax = tokens.indexOf('Tax Invoice', taxIdx + 1);
      const end = nextTax === -1 ? tokens.length : nextTax;
      const chunk = tokens.slice(taxIdx, end);
      const invoice = this.parseInvoiceChunk(chunk);
      if (invoice && invoice.items.length) invoices.push(invoice);
      start = end;
    }
    
    return invoices;
  }

  private addFallbackConvenience(tokens: string[], invoices: Invoice[]): void {
    const already = invoices.some(inv =>
      inv.items.some(it => /convenience charge/i.test(it.description || ''))
    );
    if (already) return;
    
    const idx = tokens.findIndex(t => /convenience charge/i.test(t));
    if (idx === -1) return;
    
    const orderIdx = tokens.lastIndexOf('Order Id', idx);
    const orderToken = orderIdx !== -1 ? (tokens[orderIdx + 1] === ':' ? tokens[orderIdx + 2] : tokens[orderIdx + 1]) : null;
    
    const dateIdx = tokens.lastIndexOf('Invoice Date', idx);
    const dateToken = dateIdx !== -1 ? (tokens[dateIdx + 1] === ':' ? tokens[dateIdx + 2] : tokens[dateIdx + 1]) : null;
    
    const nums: number[] = [];
    for (let j = idx + 1; j < tokens.length && nums.length < 9; j++) {
      const n = this.numFrom(tokens[j]);
      if (n === null) {
        if (nums.length) break;
        continue;
      }
      nums.push(n);
    }
    if (!nums.length) return;
    
    const qty = nums[2] ?? 1;
    const total = nums[8] ?? nums[0];
    const unit_price = qty ? total / qty : total;
    
    invoices.push({
      invoice_no: null,
      order_no: orderToken || null,
      date: this.normalizeDate(dateToken),
      delivery_partner: {
        registered_name: 'Blink Commerce Private Limited (formerly known as Grofers India Private Limited)',
        known_name: 'Blinkit'
      },
      items: [
        {
          sr: 1,
          description: 'Convenience charge',
          qty,
          unit_price,
          price: total,
          category: 'Charges'
        }
      ],
      items_total: total || null
    });
  }

  private addFallbackHandlingCharge(tokens: string[], invoices: Invoice[]): void {
    const already = invoices.some(inv =>
      inv.items.some(it => /handling charge/i.test(it.description || ''))
    );
    if (already) return;
    
    const idx = tokens.findIndex(t => /handling charge/i.test(t));
    if (idx === -1) return;
    
    const orderIdx = tokens.lastIndexOf('Order Id', idx);
    const orderToken = orderIdx !== -1 ? (tokens[orderIdx + 1] === ':' ? tokens[orderIdx + 2] : tokens[orderIdx + 1]) : null;
    
    const dateIdx = tokens.lastIndexOf('Invoice Date', idx);
    const dateToken = dateIdx !== -1 ? (tokens[dateIdx + 1] === ':' ? tokens[dateIdx + 2] : tokens[dateIdx + 1]) : null;
    
    const nums: number[] = [];
    for (let j = idx + 1; j < tokens.length && nums.length < 9; j++) {
      const n = this.numFrom(tokens[j]);
      if (n === null) {
        if (nums.length) break;
        continue;
      }
      nums.push(n);
    }
    if (!nums.length) return;
    
    const qty = nums[2] ?? 1;
    const total = nums[8] ?? nums[0];
    const unit_price = qty ? total / qty : total;
    
    invoices.push({
      invoice_no: null,
      order_no: orderToken || null,
      date: this.normalizeDate(dateToken),
      delivery_partner: {
        registered_name: 'Blink Commerce Private Limited (formerly known as Grofers India Private Limited)',
        known_name: 'Blinkit'
      },
      items: [
        {
          sr: 1,
          description: 'Handling charge',
          qty,
          unit_price,
          price: total,
          category: 'Charges'
        }
      ],
      items_total: total || null
    });
  }

  private mergeAll(invoices: Invoice[], tokens: string[]): Invoice | null {
    this.addFallbackConvenience(tokens, invoices);
    this.addFallbackHandlingCharge(tokens, invoices);
    
    const allItems: InvoiceItem[] = [];
    const orderNos: string[] = [];
    const invoiceNos: string[] = [];
    
    for (const inv of invoices) {
      const hasChargesOnly = inv.items.some(it => /convenience charge|handling charge/i.test(it.description || ''));
      if (inv.order_no && !hasChargesOnly && typeof inv.order_no === 'string') {
        orderNos.push(inv.order_no);
      }
      if (inv.invoice_no && typeof inv.invoice_no === 'string') {
        invoiceNos.push(inv.invoice_no);
      }
      for (const item of inv.items) {
        allItems.push({ ...item });
      }
    }
    
    if (!allItems.length) return null;
    
    allItems.sort((a, b) => (a.sr || 0) - (b.sr || 0));
    allItems.forEach((it, idx) => { it.sr = idx + 1; });
    
    const items_total = allItems
      .map(it => it.price)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
      .reduce((a, b) => a + b, 0);
    
    const uniqueOrders = [...new Set(orderNos)];
    const order_no = uniqueOrders.length <= 1 ? (uniqueOrders[0] || null) : uniqueOrders;
    
    const uniqueInvoices = [...new Set(invoiceNos)];
    const invoice_no = uniqueInvoices.length ? uniqueInvoices.join(', ') : null;
    
    return {
      invoice_no,
      order_no,
      date: invoices.find(inv => inv.date)?.date || null,
      delivery_partner: invoices.find(inv => inv.delivery_partner)?.delivery_partner || null,
      items: allItems,
      items_total: items_total || null
    };
  }
}

export const blinkitParser = new BlinkitParser();

