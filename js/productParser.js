// Parses beverage_product_list.txt from root directory and maps products to Bar Assistant shelf ingredients

export function parseProductListText(rawText) {
    const lines = rawText.split(/\r?\n/);
    const productsByStock = new Map();
    const categories = [];
    let currentCategory = 'OTHER';
    let totalLineItems = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const catMatch = line.match(/^\[(.+?)\]\s*\(\d+\s*items?\)$/i);
        if (catMatch) {
            currentCategory = catMatch[1].trim();
            if (!categories.includes(currentCategory)) {
                categories.push(currentCategory);
            }
            continue;
        }

        const itemMatch = line.match(/^-\s+(.+?)\s*\|\s*([^|]+?)\s*\|\s*\$?(-?\d+(?:\.\d+)?)\s*\((stock-\d+)\)$/i);
        if (itemMatch) {
            totalLineItems++;
            const name = itemMatch[1].trim();
            const size = itemMatch[2].trim();
            const price = Number(itemMatch[3]);
            const stockId = itemMatch[4].trim();

            const key = `${currentCategory}::${stockId}::${name}`;
            if (!productsByStock.has(key)) {
                productsByStock.set(key, {
                    stockId,
                    name,
                    category: currentCategory,
                    variants: []
                });
            }
            productsByStock.get(key).variants.push({ size, price });
        }
    }

    const products = [...productsByStock.values()].sort((a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );

    return {
        products,
        categories,
        totalLineItems
    };
}

export function mapProductsToShelfIds(products, ingredientMap) {
    const shelfIds = new Set();
    const addIfExists = (id) => {
        if (ingredientMap.has(id)) shelfIds.add(id);
    };

    const rules = [
        [/\baperol\b/i, ['aperol']],
        [/\bcampari\b/i, ['campari']],
        [/\bmartini rosso\b/i, ['sweet-vermouth']],
        [/\bpimms\b/i, ['pimms-no-1', 'pimms']],
        [/\bgin\b|\bhendricks\b|\btanqueray\b|\broku\b|\bscapegrace\b|\bfour pillars\b|\bbombay\b|\bgordons\b/i, ['gin']],
        [/\bbourbon\b|\bjack daniels\b|\bjim beam\b|\bknob creek\b|\bmakers mark\b|\bwild turkey\b|\bearly times\b/i, ['bourbon-whiskey']],
        [/\brye\b/i, ['rye-whiskey']],
        [/\bscotch\b|\bglenfiddich\b|\bjohnnie walker\b|\blaphroaig\b|\btalisker\b|\bfamous grouse\b/i, ['scotch-whiskey', 'blended-scotch-whisky']],
        [/\blaphroaig\b/i, ['islay-scotch-whiskey']],
        [/\bjameson\b|\birish\b/i, ['irish-whiskey']],
        [/\bcanadian\b/i, ['canadian-whisky', 'whiskey']],
        [/\btennessee\b|\bjack daniels\b/i, ['tennessee-whiskey']],
        [/\bchatelle\b|\bbrandy\b|\bcognac\b/i, ['brandy', 'cognac']],
        [/\bvodka\b|\bsmirnoff\b|\babsolut\b|\bgrey goose\b|\bbelvedere\b/i, ['vodka']],
        [/\bcitron\b/i, ['vodka-citron']],
        [/\bvanilla\b.*\bvodka\b/i, ['vanilla-vodka']],
        [/\brum\b|\bappleton\b|\bbacardi\b|\bcoruba\b|\bkraken\b|\bsailor jerry\b|\bhelmsman\b/i, ['rum']],
        [/\bcarta blanca\b|\bwhite rum\b/i, ['light-rum']],
        [/\bdark rum\b|\bcoruba\b|\bocho\b/i, ['dark-rum']],
        [/\bspiced\b/i, ['spiced-rum']],
        [/\bmalibu\b/i, ['coconut-rum']],
        [/\btequila\b|\bjose cuervo\b|\bpatron\b|\bdon julio\b/i, ['tequila', 'tequila-blanco']],
        [/\breposado\b/i, ['tequila-reposado']],
        [/\banejo\b/i, ['tequila-anejo']],
        [/\btriple sec\b/i, ['triple-sec']],
        [/\bcointreau\b/i, ['cointreau', 'triple-sec']],
        [/\bblue curacao\b/i, ['blue-curacao']],
        [/\bchambord\b/i, ['chambord']],
        [/\bbaileys\b/i, ['baileys-irish-cream']],
        [/\bkahlua\b|\btia maria\b/i, ['coffee-liqueur']],
        [/\bmidori\b/i, ['midori', 'melon-liqueur']],
        [/\bjagermeister\b/i, ['jagermeister']],
        [/\bst germain\b/i, ['st-germain']],
        [/\bgalliano\b/i, ['galliano']],
        [/\bdrambuie\b/i, ['drambuie']],
        [/\bsambucca\b/i, ['sambuca']],
        [/\bpeach schnapps\b/i, ['peach-liqueur', 'peach-schnapps']],
        [/\bbutterscotch\b/i, ['butterscotch-schnapps']],
        [/\bfrangelico\b/i, ['hazelnut-liqueur']],
        [/\btonic\b/i, ['tonic']],
        [/\bginger beer\b/i, ['ginger-beer']],
        [/\bginger ale\b/i, ['ginger-ale']],
        [/\bsoda water\b/i, ['club-soda']],
        [/\bcoca-cola\b/i, ['cola']],
        [/\blemonade\b|\bsprite\b/i, ['lemon-lime-soda', 'lemon-soda']],
        [/\borange juice\b/i, ['orange-juice']],
        [/\bcranberry juice\b/i, ['cranberry-juice']],
        [/\bpineapple juice\b/i, ['pineapple-juice']],
        [/\btomato juice\b/i, ['tomato-juice']],
        [/\bapple juice\b/i, ['apple-juice']],
        [/\bwater\b/i, ['water']],
        [/\bprosecco\b/i, ['prosecco', 'sparkling-wine']],
        [/\bmoet\b|\bpelorus\b|\bbrut\b/i, ['champagne', 'sparkling-wine']],
        [/\btawny port\b/i, ['tawny-port']],
        [/\bcoffee\b|\blatte\b|\bshort black\b|\blong black\b|\bflat white\b/i, ['coffee', 'espresso']],
        [/\bhot chocolate\b/i, ['hot-chocolate']],
        [/\blemon, lime & bitters\b/i, ['angostura-aromatic-bitters']]
    ];

    for (const p of products) {
        if (p.category === 'RED WINE') addIfExists('red-wine');
        if (p.category === 'WHITE WINE') addIfExists('white-wine');
        if (p.category === 'BEER') addIfExists('beer');

        for (const [regex, ids] of rules) {
            if (regex.test(p.name)) {
                ids.forEach(addIfExists);
            }
        }
    }

    return [...shelfIds];
}
