// npm install pdf.js-extract
const { PDFExtract } = require('pdf.js-extract');
const fs = require('fs');

const categories = [
    // Priority-first order so specific categories win before broad matches.
    {
        // Fresh fruits (fresh produce)
        regex: /\b(apple|banana|mango|orange|grape|berry|berries|watermelon|papaya|pineapple|kiwi|melon|pomegranate|coconut|tender\s*coconut|fruit|fruits)\b/i,
        category: 'Fresh Produce – Fruits'
    },
    {
        // Fresh vegetables, herbs, fresh produce, root-veg, leafy, etc.
        regex: /\b(onion|tomato|potato|carrot|capsicum|bell\s*pepper|cabbage|cauliflower|spinach|palak|methi|fenugreek|beans|beans\s*haricot|okra|lady\s*finger|pea|peas|ginger|garlic|chilli|green\s*chilli|chilli\s*green|mushroom|fresh\s*produce|vegetable|vegetables|leafy\s*vegetable|leaves|herb|herbs)\b/i,
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
