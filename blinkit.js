// npm install pdf.js-extract
const { PDFExtract } = require('pdf.js-extract');
const fs = require('fs');

// Reuse the same category matcher as zepto.js so we can classify rows.
const categories = [
    {
        regex: /\b(cigarette|tobacco|cigar|vape|hookah|pan|paan|supari|stellar define|chewing tobacco|rolling paper|lighter|smoke|\bGold\s*Flake\b|\bWills\s*(?:Classic|Navy\s*Cut)\b|\bClassic\b|\bNavy\s*Cut\b|\bFour\s*Square\b|\bBenson\s*&\s*Hedges\b|\bMarlboro\b|\bBristol\b|\bInsignia\b|\bPlayers\b|\bScissors\b|\bCapstan\b|\bBerkeley\b|\bRed\s*&\s*White\b)\b/i,
        category: 'Tobacco'
    },
    {
        regex: /\b(chip|chips|nacho|kurkure|lays|bingo|pringles|doritos|namkeen|bhujia|mixture|sev|popcorn|makhana|cracker|snack|packaged snack)\b/i,
        category: 'Snacks & Munchies'
    },
    {
        regex: /\b(chocolate|candy|sweet|sweets|mithai|barfi|ladoo|pedha|halwa|dessert|ice cream|ice-cream|icecream|cornetto|popsicle|frozen dessert|cookie|biscuit|wafer|cake|pastry|sweet snack)\b/i,
        category: 'Savories | Sweet Tooth'
    },
    {
        regex: /\b(milk|curd|yogurt|dahi|paneer|cheese|butter|cream|margarine|lassi|buttermilk|ghee|milk powder|condensed milk)\b/i,
        category: 'Dairy'
    },
    {
        regex: /\b(juice|fruit juice|soft drink|cola|soda|mineral water|water bottle|cold drink|drink|energy drink|tea|coffee|chai|tea bag|green tea|coffee powder|health drink|malt drink|beverage)\b/i,
        category: 'Beverages'
    },
    {
        regex: /\b(onion|beetroot|leaves|leaf|potato|tomato|ginger|garlic|chilli|lemon|coriander|spinach|palak|carrot|cauliflower|cabbage|cucumber|capsicum|gourd|okra|bhindi|brinjal|mushroom|peas|beans|vegetable|vegetables|fresh produce|rice|dal|pulse|lady finger|methi|fenugreek|idli|dosa|batter|lentil|flour|atta|sooji|besan|maida|sugar|salt|jaggery|poha|grain|grains|oil|ghee|groundnut|peanut)\b/i,
        category: 'Groceries'
    },
    {
        regex: /.*/i,
        category: 'Others'
    }
];

function categorizeDescription(description) {
    const text = (description || '').toLowerCase();
    for (const rule of categories) {
        if (rule.regex.test(text)) return rule.category;
    }
    return 'Others';
}

function numFrom(token) {
    if (!token) return null;
    const n = parseFloat(String(token).replace(/[^\d.-]/g, ''));
    return Number.isNaN(n) ? null : n;
}

function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    // dd-MMM-YYYY (e.g., 08-Nov-2025)
    const mAlpha = trimmed.match(/^(\d{1,2})[-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[-/](\d{2,4})/i);
    if (mAlpha) {
        const [_, d, mon, y] = mAlpha;
        const monthMap = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
        };
        const mm = monthMap[mon.toLowerCase()];
        const yyyy = y.length === 2 ? `20${y}` : y.padStart(4, '0');
        const dd = d.padStart(2, '0');
        return `${dd}-${String(mm).padStart(2, '0')}-${yyyy}`;
    }
    // dd-MM-YYYY already numeric
    const mNum = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (mNum) {
        const dd = mNum[1].padStart(2, '0');
        const mm = mNum[2].padStart(2, '0');
        const yyyy = mNum[3].length === 2 ? `20${mNum[3]}` : mNum[3].padStart(4, '0');
        return `${dd}-${mm}-${yyyy}`;
    }
    return trimmed;
}

function matchesPattern(tokens, i, pattern) {
    for (let k = 0; k < pattern.length; k++) {
        if (!tokens[i + k] || tokens[i + k].toLowerCase() !== pattern[k].toLowerCase()) return false;
    }
    return true;
}

function findValueAfter(tokens, pattern) {
    for (let i = 0; i < tokens.length; i++) {
        if (matchesPattern(tokens, i, pattern)) {
            let j = i + pattern.length;
            if (tokens[j] === ':') j++;
            return tokens[j] || null;
        }
    }
    return null;
}

function findValueByLabel(tokens, regex) {
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

function parseHeader(tokens, limitIdx) {
    const windowTokens = tokens.slice(0, limitIdx);
    
    const invoice_no =
    findValueByLabel(windowTokens, /invoice\s*number/i) ||
    findValueAfter(windowTokens, ['Invoice', 'Number']);
    const order_id =
    findValueByLabel(windowTokens, /order\s*id/i) ||
    findValueAfter(windowTokens, ['Order', 'Id']);
    const invoice_date =
    findValueByLabel(windowTokens, /invoice\s*date/i) ||
    findValueAfter(windowTokens, ['Invoice', 'Date']);
    
    // Delivery partner is always Blinkit (per requirement)
    const delivery_partner = {
        registered_name: 'Blink Commerce Private Limited (formerly known as Grofers India Private Limited)',
        known_name: 'Blinkit'
    };
    
    return {
        invoice_no,
        order_no: order_id, // align schema with zepto
        date: normalizeDate(invoice_date),
        delivery_partner
    };
}

function parseItems(tokens, srIdx, hasUPC) {
    let i = srIdx + 1;
    // Advance to the first row number
    while (i < tokens.length && !/^\d+$/.test(tokens[i])) i++;
    
    const items = [];
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
            
            const numeric = numFrom(tok);
            const isPureNumber = /^-?\d+(?:\.\d+)?$/.test(tok);
            if (numeric !== null && isPureNumber) break;
            
            descTokens.push(tok);
            i++;
        }
        
        const expectedNumeric = hasUPC ? 11 : 10; // convenience-charge tables carry total as extra numeric
        const numericTokens = [];
        while (i < tokens.length && numericTokens.length < expectedNumeric) {
            const val = numFrom(tokens[i]);
            if (val === null) break;
            numericTokens.push(val);
            i++;
        }
        
        if (numericTokens.length < expectedNumeric - 1) break; // not enough data to trust
        
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
            null,
            null,
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

function parseInvoiceChunk(chunkTokens) {
    const srIdx = chunkTokens.indexOf('Sr. no');
    if (srIdx === -1) return null;
    
    const hasUPC = (chunkTokens[srIdx + 1] || '').toLowerCase().includes('upc');
    const header = parseHeader(chunkTokens, srIdx);
    const items = parseItems(chunkTokens, srIdx, hasUPC);
    
    const items_total = items
    .map(it => it.price)
    .filter(v => typeof v === 'number' && !Number.isNaN(v))
    .reduce((a, b) => a + b, 0);
    
    return {
        ...header,
        items,
        items_total: items_total || null
    };
}

function mergeByOrderNo(invoices) {
    const byOrder = new Map();
    for (const inv of invoices) {
        const key = inv.order_no || '';
        if (!byOrder.has(key)) byOrder.set(key, []);
        byOrder.get(key).push(inv);
    }
    
    const merged = [];
    for (const [order_no, group] of byOrder.entries()) {
        if (!order_no) continue;
        const allItems = [];
        for (const inv of group) {
            for (const item of inv.items) {
                allItems.push({ ...item });
            }
        }
        // Re-sequence sr and sum totals
        allItems.sort((a, b) => (a.sr || 0) - (b.sr || 0));
        allItems.forEach((it, idx) => { it.sr = idx + 1; });
        const items_total = allItems
        .map(it => it.price)
        .filter(v => typeof v === 'number' && !Number.isNaN(v))
        .reduce((a, b) => a + b, 0);
        
        merged.push({
            invoice_no: null,
            order_no,
            date: group.find(g => g.date)?.date || null,
            delivery_partner: group[0]?.delivery_partner || null,
            items: allItems,
            items_total: items_total || null
        });
    }
    
    return merged;
}

function mergeAll(invoices) {
    const allItems = [];
    const orderNos = [];
    for (const inv of invoices) {
        const hasConvenience = inv.items.some(it => /convenience charge/i.test(it.description || ''));
        if (inv.order_no && !hasConvenience) orderNos.push(inv.order_no);
        for (const item of inv.items) {
            allItems.push({ ...item });
        }
    }
    if (!allItems.length) return null;
    
    allItems.sort((a, b) => (a.sr || 0) - (b.sr || 0));
    allItems.forEach((it, idx) => { it.sr = idx + 1; });
    const items_total = allItems
    .map(it => it.price)
    .filter(v => typeof v === 'number' && !Number.isNaN(v))
    .reduce((a, b) => a + b, 0);
    
    const uniqueOrders = [...new Set(orderNos)];
    const order_no = uniqueOrders.length <= 1 ? (uniqueOrders[0] || null) : uniqueOrders;
    
    return {
        invoice_no: null,
        order_no,
        date: invoices.find(inv => inv.date)?.date || null,
        delivery_partner: invoices.find(inv => inv.delivery_partner)?.delivery_partner || null,
        items: allItems,
        items_total: items_total || null
    };
}

function addFallbackConvenience(tokens, invoices) {
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
    
    const nums = [];
    for (let j = idx + 1; j < tokens.length && nums.length < 9; j++) {
        const n = numFrom(tokens[j]);
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
        date: normalizeDate(dateToken),
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
                category: 'Others'
            }
        ],
        items_total: total || null
    });
}

async function parsePdf(path) {
    const pdfExtract = new PDFExtract();
    const data = await new Promise((res, rej) => {
        pdfExtract.extract(path, {}, (err, d) => (err ? rej(err) : res(d)));
    });
    
    const tokens = [];
    for (const page of data.pages) {
        for (const c of page.content) {
            const t = (c.str || '').trim();
            if (t) tokens.push(t);
        }
    }
    
    const invoices = [];
    let start = 0;
    while (start < tokens.length) {
        const taxIdx = tokens.indexOf('Tax Invoice', start);
        if (taxIdx === -1) break;
        const nextTax = tokens.indexOf('Tax Invoice', taxIdx + 1);
        const end = nextTax === -1 ? tokens.length : nextTax;
        const chunk = tokens.slice(taxIdx, end);
        const invoice = parseInvoiceChunk(chunk);
        if (invoice && invoice.items.length) invoices.push(invoice);
        start = end;
    }
    
    addFallbackConvenience(tokens, invoices);
    const merged_all_items = mergeAll(invoices);
    
    return {
        invoices: merged_all_items ? [merged_all_items] : []
    };
}

// Run and dump JSON
(async () => {
    const path = process.argv[2] || 'ForwardInvoice_ORD63610386301.pdf';
    const res = await parsePdf(path);
    fs.writeFileSync(path + '.parsed.json', JSON.stringify(res, null, 2));
    console.log('Parsed JSON saved to', path + '.parsed.json');
})();

