// npm install pdf.js-extract
const { PDFExtract } = require('pdf.js-extract');
const fs = require('fs');

// Reuse the same category matcher as zepto.js so we can classify rows.
const categories = [
    {
        // Fresh fruits (fresh produce)
        regex: /\b(apple|banana|mango|orange|grape|berry|berries|watermelon|papaya|pineapple|kiwi|melon|pomegranate|coconut|tender\s*coconut|fruit|fruits)\b/i,
        category: 'Fresh Produce – Fruits'
    },
    {
        // Fresh vegetables, herbs, fresh produce, root-veg, leafy, etc.
        regex: /\b(onion|tomato|potato|carrot|capsicum|bell\s*pepper|cabbage|cauliflower|spinach|palak|methi|fenugreek|beans|beans\s*haricot|okra|lady\s*finger|pea|peas|ginger|garlic|chilli|green\s*chilli|chilli\s*green|mushroom|brinjal|fresh\s*produce|vegetable|vegetables|leafy\s*vegetable|leaves|herb|herbs)\b/i,
        category: 'Fresh Produce – Vegetables & Herbs'
    },
    {
        // Staples: rice, flour/atta/sooji/poha/pulses/grains, cooking essentials like cooking oil
        regex: /\b(rice|sonamasuri|poha|atta|flour|sooji|maida|dal|lentil|pulses|grain|grains|cereal|wheat|rice\s*flour|pulse|oil|sunflower\s*oil|refined\s*oil|groundnut\s*oil|edible\s*oil|ghee|sugar|salt|jaggery)\b/i,
        category: 'Staples & Pantry'
    },
    {
        // Spices, condiments, sauces, pickles, masalas, cooking flavour / condiments
        regex: /\b(spice|masala|masalas|salt|pepper|seasoning|sauce|soy\s*sauce|green\s*chilli\s*sauce|red\s*chilli\s*sauce|pickl(e|es)|pickle|pickle\s*jar|condiment|chutney|paste|ginger\s*garlic\s*paste)\b/i,
        category: 'Spices, Condiments & Cooking Essentials'
    },
    {
        // Dairy products & eggs & related — milk, butter, yogurt/curd, paneer/cheese, cream, ghee etc.
        regex: /\b(milk|dairy|curd|yogurt|yoghurt|paneer|cheese|butter|cream|ghee|dahi|lassi|buttermilk|condensed\s*milk|milk\s*powder)\b/i,
        category: 'Dairy & Eggs'
    },
    {
        // Bakery and bread goods: bread, buns, croissants, bakery items
        regex: /\b(bread|bun|buns|croissant|bagel|bun\s*mask(a)?|pastry|bakery|loaf|roll|rolls)\b/i,
        category: 'Bakery & Bread'
    },
    {
        // Snacks — salty / savoury snacks (chips, namkeen, crackers, salted snacks)
        regex: /\b(chip|chips|crisps|kurkure|nacho|namkeen|snack|salty\s*snack|popcorn|cracker|wafers?)\b/i,
        category: 'Snacks & Salty Snacks'
    },
    {
        // Confectionery, sweets, chocolates, desserts, biscuity sweet snacks
        regex: /\b(chocolate|chocolates|candy|sweets?|dessert|ice\s*cream|ice\-cream|icecream|cornetto|popsicle|frozen\s*dessert|cookie|cookies|biscuit|biscuits|wafer|waffle|croissant|cake|sweet\s*snack|sweet)\b/i,
        category: 'Confectionery & Sweet Tooth'
    },
    {
        // Frozen & refrigerated desserts / frozen items (ice-cream, frozen food)
        regex: /\b(ice\s*cream|frozen|frozen\s*food|icecream|cornetto|popsicle)\b/i,
        category: 'Frozen & Refrigerated Items'
    },
    {
        // Instant / ready-to-eat / ready-to-cook foods (quick meals, noodles, batters, meal kits)
        regex: /\b(maggi|noodle|noodles|instant\s*(meal|meals|food|foods)|ramen|cup\s*noodles|ready[-\s]*to[-\s]*eat|ready[-\s]*to[-\s]*cook|batter|meal\s*kit)\b/i,
        category: 'Instant & Ready-to-Cook Foods'
    },
    {
        // Beverages: soft drinks, soda, energy drinks, tea/coffee, bottled / canned drinks
        regex: /\b(juice|fruit\s*juice|soft\s*drink|cola|soda|mineral\s*water|bottled\s*water|cold\s*drink|drink|beverage|energy\s*drink|tea|coffee|chai|coffee\s*powder|tea\s*bag|milk\s*drink|health\s*drink)\b/i,
        category: 'Beverages & Drinks'
    },
    {
        // Tobacco & related: cigarettes, pan/paan, chewing tobacco, hookah, tobacco-products
        regex: /\b(cigarette|tobacco|cigar|pan|paan|supari|smoke|hookah|chewing\s*tobacco|rolling\s*paper|lighter|\bGold\s*Flake\b|\bMarlboro\b|\bWills\b|\bPlayers\b|\bStellar\s*Define\b|\bMagnate\b|\bMagic\s*Switch\b)\b/i,
        category: 'Tobacco & Related'
    },
    {
        // Non-food: household items, personal care, gift items, non-edible products — includes other misc items
        regex: /\b(bouquet|flower|gift|hygiene|cleaning|soap|detergent|shampoo|toothpaste|sanitary|pad|tray|tape|bopp\s*tape|packet|box|packaging|wrap|misc|miscellaneous)\b/i,
        category: 'Household, Personal Care & Miscellaneous'
    },
    {
        // Charges / fees
        regex: /\b(convenience\s*charge|delivery\s*charge|service\s*charge|platform\s*fee|handling\s*charge)\b/i,
        category: 'Charges & Fees'
    },
    {
        // Fallback default
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

