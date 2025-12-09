// npm install pdf.js-extract
const { PDFExtract } = require('pdf.js-extract');
const fs = require('fs');

const categories = [
    // Priority-first order so specific categories win before broad matches.
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
        if (rule.regex.test(text)) {
            return rule.category;
        }
    }
    return 'Others';
}

function cleanRegisteredName(raw) {
    if (!raw) return null;
    // Drop anything in parentheses and collapse whitespace
    const withoutParens = raw.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return withoutParens || null;
}

function deriveKnownName(registered) {
    if (!registered) return null;
    const known = registered.replace(/\bprivate\s+limited\b/ig, '').replace(/\s+/g, ' ').trim();
    return known || registered;
}

function isHSN(text) {
    return /^\d{6,8}$/.test(text.trim());
}

function parseInvoiceFromTokens(tokens) {
    const invoice = {
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
    
    // Header fields (Invoice No, Order No, Date) appear near the top
    for (const t of tokens.slice(0, 40)) {
        if (t.startsWith('Invoice No.:')) {
            invoice.invoice_no = t.split('Invoice No.:')[1].trim() || null;
        } else if (t.startsWith('Order No.:')) {
            invoice.order_no = t.split('Order No.:')[1].trim() || null;
        } else if (t.startsWith('Date')) {
            // Example: "Date : 14-11-2025"
            const m = t.match(/(\d{2}-\d{2}-\d{4})/);
            if (m) invoice.date = m[1];
        }
    }

    // Delivery partner: appears after "Order Delivered From -"
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
            const registered_name = cleanRegisteredName(rawName);
            const known_name = deriveKnownName(registered_name);
            invoice.delivery_partner = { registered_name, known_name };
        }
    }
    
    // Find the header start ("SR")
    const headerIdx = tokens.findIndex(t => t === 'SR');
    if (headerIdx === -1) return invoice;
    
    // First pure-integer after the header is SR for row 1
    let i = tokens.findIndex((t, idx) => idx > headerIdx && /^\d+$/.test(t));
    if (i === -1) return invoice;
    
    while (i < tokens.length) {
        const srToken = tokens[i];
        if (!/^\d+$/.test(srToken)) break;
        const sr = parseInt(srToken, 10);
        i++;
        
        // Collect description until we hit an HSN (6–8 digit code)
        const descTokens = [];
        while (i < tokens.length && !isHSN(tokens[i])) {
            // Stop if we clearly hit the totals section
            if (/^Item$/i.test(tokens[i]) && /Total/i.test(tokens[i + 1] || '')) {
                return invoice;
            }
            descTokens.push(tokens[i]);
            i++;
        }
        
        if (i >= tokens.length || !isHSN(tokens[i])) break;
        const hsn = tokens[i];
        i++;
        
        // Qty should be the next numeric token
        if (i >= tokens.length) break;
        const qty = parseFloat(tokens[i]);
        if (Number.isNaN(qty)) break;
        i++;
        
        // The Zepto invoice table has a fixed numeric pattern after qty:
        // rate, disc%, taxable, cgst%, sgst%, cgstAmt, sgstAmt, cess%, '+0.00', cessAmt, total
        const numFrom = (t) => {
            const n = parseFloat(t.replace(/[^\d.]/g, ''));
            return Number.isNaN(n) ? null : n;
        };
        if (i + 10 >= tokens.length) break;
        
        const rateToken = tokens[i++];
        i += 9; // skip discount/tax columns we don't output
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
        
        // Stop if we've reached totals / footer
        if (i >= tokens.length) break;
        if (/^Item$/i.test(tokens[i]) || /^Invoice$/i.test(tokens[i])) break;
    }
    
    // Compute items_total as the sum of all price values
    const sum = invoice.items
    .map(it => it.price)
    .filter(v => typeof v === 'number' && !Number.isNaN(v))
    .reduce((a, b) => a + b, 0);
    invoice.items_total = sum || null;
    
    return invoice;
}

async function parsePdf(path) {
    const pdfExtract = new PDFExtract();
    const data = await new Promise((res, rej) => {
        pdfExtract.extract(path, {}, (err, d) => (err ? rej(err) : res(d)));
    });
    
    // This version of pdf.js-extract does not expose positions; we parse by text order.
    const tokens = [];
    for (const page of data.pages) {
        for (const c of page.content) {
            const t = (c.str || '').trim();
            if (t) tokens.push(t);
        }
    }
    
    const invoice = parseInvoiceFromTokens(tokens);
    const results = { invoices: [] };
    if (invoice.items.length) {
        results.invoices.push(invoice);
    }
    return results;
}

// Run and dump JSON
(async () => {
    const path = process.argv[2] || 'invoice.pdf';
    const res = await parsePdf(path);
    fs.writeFileSync(path + '.parsed.json', JSON.stringify(res, null, 2));
    console.log('Parsed JSON saved to', path + '.parsed.json');
})();
