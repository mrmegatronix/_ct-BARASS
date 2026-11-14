// Bar Assistant (_ct-BARASS) Data Store & Domain Engine
import { mapProductsToShelfIds, parseProductListText } from './productParser.js';

const STORAGE_KEY = 'ct_barass_state_v2';

const DEFAULT_USER_STATE = {
    bars: [
        {
            id: 'coasters-tavern',
            name: 'Coasters Tavern',
            shelf: [],
            shoppingList: []
        }
    ],
    activeBarId: 'coasters-tavern',
    favorites: [],
    ratings: {}, // { [cocktailId]: { rating: number, note: string } }
    collections: [], // [{ id, name, description, cocktailIds: [] }]
    customCocktails: [],
    deletedCocktailIds: [],
    customIngredients: [],
    deletedIngredientIds: [],
    unit: 'ml'
};

export const store = {
    baseCocktails: [],
    baseIngredients: [],
    glasses: [],
    methods: [],
    utensils: [],
    categories: [],
    tasteDescriptors: [],
    calculators: [],
    products: [],
    productCategories: [],
    productLineItemCount: 0,
    user: structuredClone(DEFAULT_USER_STATE),

    // Computed indexes
    cocktails: [],
    ingredients: [],
    cocktailMap: new Map(),
    ingredientMap: new Map(),
    methodMap: new Map(),
    childIngredientMap: new Map(), // parent_id -> Set<child_id>
    allTags: [],

    async init() {
        const [
            cocktails,
            ingredients,
            glasses,
            methods,
            utensils,
            categories,
            tasteDescriptors,
            calculators,
            productListText
        ] = await Promise.all([
            fetch('data/cocktails.json').then(r => r.json()),
            fetch('data/ingredients.json').then(r => r.json()),
            fetch('data/base_glasses.json').then(r => r.json()),
            fetch('data/base_methods.json').then(r => r.json()),
            fetch('data/base_utensils.json').then(r => r.json()),
            fetch('data/base_ingredient_categories.json').then(r => r.json()),
            fetch('data/base_taste_descriptors.json').then(r => r.json()),
            fetch('data/calculators.json').then(r => r.json()),
            fetch('beverage_product_list.txt').then(r => r.text())
        ]);

        const parsedProducts = parseProductListText(productListText);
        this.products = parsedProducts.products;
        this.productCategories = parsedProducts.categories;
        this.productLineItemCount = parsedProducts.totalLineItems;

        this.baseCocktails = cocktails;
        this.baseIngredients = ingredients;
        this.glasses = glasses;
        this.methods = methods;
        this.utensils = utensils;
        this.categories = categories;
        this.tasteDescriptors = tasteDescriptors;
        this.calculators = calculators;

        this.methodMap = new Map(methods.map(m => [m.name.toLowerCase(), m]));
        const hasSaved = this.loadUserState();
        this.rebuildIndexes();
        if (!hasSaved) {
            const bar = this.getActiveBar();
            bar.shelf = mapProductsToShelfIds(this.products, this.ingredientMap);
            this.saveUserState();
        }
    },

    loadUserState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.user = { ...structuredClone(DEFAULT_USER_STATE), ...parsed };
                if (!Array.isArray(this.user.bars) || this.user.bars.length === 0) {
                    this.user.bars = structuredClone(DEFAULT_USER_STATE.bars);
                }
                if (!this.user.bars.some(b => b.id === this.user.activeBarId)) {
                    this.user.activeBarId = this.user.bars[0].id;
                }
                return true;
            }
        } catch (err) {
            console.error('Failed to load user state:', err);
            this.user = structuredClone(DEFAULT_USER_STATE);
        }
        return false;
    },

    saveUserState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
        } catch (err) {
            console.error('Failed to save user state:', err);
        }
    },

    rebuildIndexes() {
        const deletedIngSet = new Set(this.user.deletedIngredientIds || []);
        const customIngMap = new Map((this.user.customIngredients || []).map(i => [i._id, i]));
        const mergedIngredients = [];
        const seenIng = new Set();

        for (const baseIng of this.baseIngredients) {
            if (deletedIngSet.has(baseIng._id)) continue;
            if (customIngMap.has(baseIng._id)) {
                mergedIngredients.push(customIngMap.get(baseIng._id));
            } else {
                mergedIngredients.push(baseIng);
            }
            seenIng.add(baseIng._id);
        }
        for (const customIng of this.user.customIngredients || []) {
            if (!seenIng.has(customIng._id) && !deletedIngSet.has(customIng._id)) {
                mergedIngredients.push(customIng);
            }
        }
        mergedIngredients.sort((a, b) => a.name.localeCompare(b.name));
        this.ingredients = mergedIngredients;
        this.ingredientMap = new Map(mergedIngredients.map(i => [i._id, i]));

        // Build parent -> children map for hierarchical shelf matching
        this.childIngredientMap = new Map();
        for (const ing of mergedIngredients) {
            if (ing._parent_id) {
                if (!this.childIngredientMap.has(ing._parent_id)) {
                    this.childIngredientMap.set(ing._parent_id, new Set());
                }
                this.childIngredientMap.get(ing._parent_id).add(ing._id);
            }
        }

        const deletedCocktailSet = new Set(this.user.deletedCocktailIds || []);
        const customCocktailMap = new Map((this.user.customCocktails || []).map(c => [c._id, c]));
        const mergedCocktails = [];
        const seenCocktail = new Set();

        for (const baseC of this.baseCocktails) {
            if (deletedCocktailSet.has(baseC._id)) continue;
            if (customCocktailMap.has(baseC._id)) {
                mergedCocktails.push(customCocktailMap.get(baseC._id));
            } else {
                mergedCocktails.push(baseC);
            }
            seenCocktail.add(baseC._id);
        }
        for (const customC of this.user.customCocktails || []) {
            if (!seenCocktail.has(customC._id) && !deletedCocktailSet.has(customC._id)) {
                mergedCocktails.push(customC);
            }
        }
        mergedCocktails.sort((a, b) => a.name.localeCompare(b.name));
        this.cocktails = mergedCocktails;
        this.cocktailMap = new Map(mergedCocktails.map(c => [c._id, c]));

        const tagSet = new Set();
        for (const c of mergedCocktails) {
            for (const t of c.tags || []) tagSet.add(t);
        }
        this.allTags = [...tagSet].sort((a, b) => a.localeCompare(b));
    },

    getActiveBar() {
        return this.user.bars.find(b => b.id === this.user.activeBarId) || this.user.bars[0];
    },

    getShelfSet() {
        return new Set(this.getActiveBar().shelf || []);
    },

    hasIngredientInShelf(ingredientId, shelfSet) {
        if (shelfSet.has(ingredientId)) return true;
        // If user has a child variety (e.g. london-dry-gin) it can satisfy parent (gin)
        const children = this.childIngredientMap.get(ingredientId);
        if (children) {
            for (const childId of children) {
                if (this.hasIngredientInShelf(childId, shelfSet)) return true;
            }
        }
        return false;
    },

    checkCocktailAvailability(cocktail, shelfSet = this.getShelfSet()) {
        const required = [];
        const matched = [];
        const missing = [];

        for (const ingRef of cocktail.ingredients || []) {
            if (ingRef.optional) {
                const haveOpt = this.hasIngredientInShelf(ingRef._id, shelfSet);
                if (haveOpt) matched.push(ingRef);
                continue;
            }
            required.push(ingRef);
            let have = this.hasIngredientInShelf(ingRef._id, shelfSet);
            let matchedViaSub = null;
            if (!have && Array.isArray(ingRef.substitutes)) {
                for (const sub of ingRef.substitutes) {
                    const subId = typeof sub === 'string' ? sub : sub._id;
                    if (subId && this.hasIngredientInShelf(subId, shelfSet)) {
                        have = true;
                        matchedViaSub = sub;
                        break;
                    }
                }
            }
            if (have) {
                matched.push({ ...ingRef, matchedViaSub });
            } else {
                missing.push(ingRef);
            }
        }

        return {
            canMake: missing.length === 0 && required.length > 0,
            almostMakeable: missing.length === 1,
            missingCount: missing.length,
            missing,
            matched
        };
    },

    getNextBottleRecommendations(limit = 15) {
        const shelfSet = this.getShelfSet();
        const unlockCounts = new Map();

        for (const c of this.cocktails) {
            const avail = this.checkCocktailAvailability(c, shelfSet);
            if (avail.missingCount === 1) {
                const miss = avail.missing[0];
                if (!unlockCounts.has(miss._id)) {
                    unlockCounts.set(miss._id, {
                        ingredientId: miss._id,
                        name: this.ingredientMap.get(miss._id)?.name || miss.name,
                        unlocks: []
                    });
                }
                unlockCounts.get(miss._id).unlocks.push(c);
            }
        }

        return [...unlockCounts.values()]
            .sort((a, b) => b.unlocks.length - a.unlocks.length)
            .slice(0, limit);
    },

    toMl(amount, units) {
        if (!amount || isNaN(amount)) return 0;
        const u = (units || 'ml').toLowerCase().trim();
        if (u === 'ml') return Number(amount);
        if (u === 'cl') return Number(amount) * 10;
        if (u === 'oz' || u === 'fl oz') return Number(amount) * 29.5735;
        if (u === 'dash' || u === 'dashes') return Number(amount) * 0.9;
        if (u === 'barspoon' || u === 'tsp') return Number(amount) * 5;
        if (u === 'tbsp') return Number(amount) * 15;
        if (u === 'drop' || u === 'drops') return Number(amount) * 0.05;
        return 0;
    },

    formatAmount(amount, units, scale = 1) {
        if (amount === null || amount === undefined || amount === '') return '';
        const num = Number(amount) * scale;
        if (isNaN(num)) return `${amount} ${units || ''}`.trim();

        const u = (units || '').toLowerCase().trim();
        const target = this.user.unit || 'ml';

        if (u === 'ml' || u === 'cl' || u === 'oz') {
            const mlVal = this.toMl(num, u);
            let outVal = mlVal;
            if (target === 'oz') outVal = mlVal / 29.5735;
            else if (target === 'cl') outVal = mlVal / 10;
            const rounded = target === 'oz' ? Math.round(outVal * 100) / 100 : Math.round(outVal * 10) / 10;
            return `${rounded} ${target}`;
        }

        const rounded = Math.round(num * 100) / 100;
        return `${rounded} ${units || ''}`.trim();
    },

    calculateAbv(cocktail) {
        let totalVolMl = 0;
        let pureAlcoholMl = 0;

        for (const ingRef of cocktail.ingredients || []) {
            const vol = this.toMl(ingRef.amount, ingRef.units);
            if (vol <= 0) continue;
            totalVolMl += vol;
            const ingData = this.ingredientMap.get(ingRef._id);
            const strength = ingData?.strength ?? 0;
            pureAlcoholMl += vol * (strength / 100);
        }

        if (totalVolMl <= 0) return cocktail.abv ?? 0;

        const methodObj = cocktail.method ? this.methodMap.get(cocktail.method.toLowerCase()) : null;
        const dilutionPct = methodObj ? methodObj.dilution_percentage : 15;
        const finalVolMl = totalVolMl * (1 + dilutionPct / 100);
        return Math.round((pureAlcoholMl / finalVolMl) * 1000) / 10;
    },

    // Mutations
    toggleShelfIngredient(ingredientId) {
        const bar = this.getActiveBar();
        const idx = bar.shelf.indexOf(ingredientId);
        if (idx >= 0) {
            bar.shelf.splice(idx, 1);
            this.saveUserState();
            return false;
        } else {
            bar.shelf.push(ingredientId);
            this.saveUserState();
            return true;
        }
    },

    addToShoppingList(ingredientId, quantity = 1, note = '') {
        const bar = this.getActiveBar();
        const existing = bar.shoppingList.find(item => item.ingredientId === ingredientId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            bar.shoppingList.push({ ingredientId, quantity, note });
        }
        this.saveUserState();
    },

    removeFromShoppingList(ingredientId) {
        const bar = this.getActiveBar();
        bar.shoppingList = bar.shoppingList.filter(i => i.ingredientId !== ingredientId);
        this.saveUserState();
    },

    markShoppingItemPurchased(ingredientId) {
        const bar = this.getActiveBar();
        if (!bar.shelf.includes(ingredientId)) {
            bar.shelf.push(ingredientId);
        }
        bar.shoppingList = bar.shoppingList.filter(i => i.ingredientId !== ingredientId);
        this.saveUserState();
    },

    toggleFavorite(cocktailId) {
        const idx = this.user.favorites.indexOf(cocktailId);
        if (idx >= 0) {
            this.user.favorites.splice(idx, 1);
            this.saveUserState();
            return false;
        } else {
            this.user.favorites.push(cocktailId);
            this.saveUserState();
            return true;
        }
    },

    setRating(cocktailId, rating, note) {
        this.user.ratings[cocktailId] = { rating, note };
        this.saveUserState();
    },

    saveCocktail(cocktailObj) {
        const idx = this.user.customCocktails.findIndex(c => c._id === cocktailObj._id);
        if (idx >= 0) {
            this.user.customCocktails[idx] = cocktailObj;
        } else {
            this.user.customCocktails.push(cocktailObj);
        }
        this.user.deletedCocktailIds = (this.user.deletedCocktailIds || []).filter(id => id !== cocktailObj._id);
        this.saveUserState();
        this.rebuildIndexes();
    },

    deleteCocktail(cocktailId) {
        this.user.customCocktails = this.user.customCocktails.filter(c => c._id !== cocktailId);
        if (this.baseCocktails.some(c => c._id === cocktailId)) {
            if (!this.user.deletedCocktailIds.includes(cocktailId)) {
                this.user.deletedCocktailIds.push(cocktailId);
            }
        }
        this.saveUserState();
        this.rebuildIndexes();
    },

    saveIngredient(ingObj) {
        const idx = this.user.customIngredients.findIndex(i => i._id === ingObj._id);
        if (idx >= 0) {
            this.user.customIngredients[idx] = ingObj;
        } else {
            this.user.customIngredients.push(ingObj);
        }
        this.user.deletedIngredientIds = (this.user.deletedIngredientIds || []).filter(id => id !== ingObj._id);
        this.saveUserState();
        this.rebuildIndexes();
    },

    createBar(name) {
        const id = 'bar-' + Date.now();
        this.user.bars.push({ id, name, shelf: [], shoppingList: [] });
        this.user.activeBarId = id;
        this.saveUserState();
        return id;
    },

    switchBar(barId) {
        if (this.user.bars.some(b => b.id === barId)) {
            this.user.activeBarId = barId;
            this.saveUserState();
        }
    },

    deleteBar(barId) {
        if (this.user.bars.length <= 1) return false;
        this.user.bars = this.user.bars.filter(b => b.id !== barId);
        if (this.user.activeBarId === barId) {
            this.user.activeBarId = this.user.bars[0].id;
        }
        this.saveUserState();
        return true;
    },

    createCollection(name, description = '') {
        const id = 'col-' + Date.now();
        this.user.collections.push({ id, name, description, cocktailIds: [] });
        this.saveUserState();
        return id;
    },

    toggleCollectionCocktail(collectionId, cocktailId) {
        const col = this.user.collections.find(c => c.id === collectionId);
        if (!col) return;
        const idx = col.cocktailIds.indexOf(cocktailId);
        if (idx >= 0) col.cocktailIds.splice(idx, 1);
        else col.cocktailIds.push(cocktailId);
        this.saveUserState();
    },

    deleteCollection(collectionId) {
        this.user.collections = this.user.collections.filter(c => c.id !== collectionId);
        this.saveUserState();
    },

    exportBackup() {
        return JSON.stringify({
            app: '_ct-BARASS',
            exportedAt: new Date().toISOString(),
            user: this.user
        }, null, 2);
    },

    importBackup(jsonStr) {
        const parsed = JSON.parse(jsonStr);
        const userPayload = parsed.user || parsed;
        if (!userPayload || !Array.isArray(userPayload.bars)) {
            throw new Error('Invalid Bar Assistant backup file.');
        }
        this.user = { ...structuredClone(DEFAULT_USER_STATE), ...userPayload };
        this.saveUserState();
        this.rebuildIndexes();
    },

    resetAll() {
        localStorage.removeItem(STORAGE_KEY);
        this.user = structuredClone(DEFAULT_USER_STATE);
        this.rebuildIndexes();
    }
};
