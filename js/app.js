import { store } from './store.js';
import { escapeHtml, getPrimaryImage, renderCocktailCardHtml, showToast } from './utils.js';
import {
    openBackupModal,
    openCocktailDetailModal,
    openCocktailFormModal,
    openIngredientDetailModal,
    openIngredientFormModal,
    openManageBarsModal,
    openQrModal
} from './modals.js';

const state = {
    view: 'dashboard',
    globalQuery: '',
    cocktailFilters: {
        canMakeOnly: false,
        almostOnly: false,
        favOnly: false,
        tag: '',
        glass: '',
        method: '',
        abvRange: '',
        sort: 'name-asc',
        page: 1,
        perPage: 36
    },
    shelfFilter: {
        tab: 'all', // all | in-shelf | missing
        category: '',
        query: ''
    },
    ingFilter: {
        category: '',
        query: ''
    },
    productFilter: {
        category: '',
        query: ''
    },
    selectedCollectionId: null,
    menuMode: false
};

function startClock() {
    const hEl = document.getElementById('clockHours');
    const mEl = document.getElementById('clockMinutes');
    const sEl = document.getElementById('clockSeconds');
    const update = () => {
        const now = new Date();
        if (hEl) hEl.textContent = String(now.getHours()).padStart(2, '0');
        if (mEl) mEl.textContent = String(now.getMinutes()).padStart(2, '0');
        if (sEl) sEl.textContent = String(now.getSeconds()).padStart(2, '0');
    };
    update();
    setInterval(update, 1000);
}

function updateChrome() {
    const barSelect = document.getElementById('barSelect');
    if (barSelect) {
        barSelect.innerHTML = store.user.bars
            .map(b => `<option value="${escapeHtml(b.id)}" ${b.id === store.user.activeBarId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`)
            .join('');
    }

    const bar = store.getActiveBar();
    const shelfSet = store.getShelfSet();
    let makeableCount = 0;
    for (const c of store.cocktails) {
        if (store.checkCocktailAvailability(c, shelfSet).canMake) makeableCount++;
    }

    document.getElementById('badgeCocktails').textContent = store.cocktails.length;
    document.getElementById('badgeShelf').textContent = bar.shelf.length;
    document.getElementById('badgeIngredients').textContent = store.ingredients.length;
    document.getElementById('badgeProducts').textContent = store.products.length;
    document.getElementById('badgeShopping').textContent = bar.shoppingList.length;
    document.getElementById('sidebarMakeableCount').textContent = `${makeableCount} cocktail${makeableCount === 1 ? '' : 's'}`;

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === store.user.unit);
    });
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === state.view);
    });
}

function setView(viewName) {
    state.view = viewName;
    state.menuMode = false;
    updateChrome();
    renderView();
}

function renderView() {
    const container = document.getElementById('viewContainer');
    if (!container) return;

    switch (state.view) {
        case 'dashboard': renderDashboard(container); break;
        case 'cocktails': renderCocktails(container); break;
        case 'shelf': renderShelf(container); break;
        case 'ingredients': renderIngredients(container); break;
        case 'products': renderProducts(container); break;
        case 'shopping': renderShopping(container); break;
        case 'collections': renderCollections(container); break;
        case 'calculators': renderCalculators(container); break;
        case 'reference': renderReference(container); break;
        default: renderDashboard(container);
    }
}

function wireCocktailCardClicks(root) {
    root.querySelectorAll('.cocktail-card[data-cocktail-id]').forEach(card => {
        card.onclick = () => openCocktailDetailModal(card.dataset.cocktailId, () => {
            updateChrome();
            renderView();
        });
    });
}

function renderDashboard(container) {
    const shelfSet = store.getShelfSet();
    const bar = store.getActiveBar();
    const makeable = [];
    const almost = [];

    for (const c of store.cocktails) {
        const avail = store.checkCocktailAvailability(c, shelfSet);
        if (avail.canMake) makeable.push(c);
        else if (avail.almostMakeable) almost.push(c);
    }

    const favCocktails = store.user.favorites.map(id => store.cocktailMap.get(id)).filter(Boolean);
    const recommendations = store.getNextBottleRecommendations(8);
    const showcase = makeable.length > 0 ? makeable.slice(0, 8) : store.cocktails.slice(0, 8);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">${escapeHtml(bar.name)} — Dashboard</h1>
                <p class="page-subtitle">Real Bar Assistant dataset: ${store.cocktails.length} cocktails • ${store.ingredients.length} ingredients</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary" id="dashAddBottles">Stock My Shelf</button>
                <button class="btn btn-primary" id="dashNewCocktail">+ New Cocktail</button>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card" data-jump="cocktails-makeable">
                <div class="kpi-label">Can Make Right Now</div>
                <div class="kpi-value success">${makeable.length}</div>
            </div>
            <div class="kpi-card" data-jump="cocktails-almost">
                <div class="kpi-label">Missing 1 Ingredient</div>
                <div class="kpi-value accent">${almost.length}</div>
            </div>
            <div class="kpi-card" data-jump="shelf">
                <div class="kpi-label">Bottles on Shelf</div>
                <div class="kpi-value info">${bar.shelf.length}</div>
            </div>
            <div class="kpi-card" data-jump="cocktails-fav">
                <div class="kpi-label">Favorites</div>
                <div class="kpi-value">${favCocktails.length}</div>
            </div>
            <div class="kpi-card" data-jump="shopping">
                <div class="kpi-label">Shopping List</div>
                <div class="kpi-value">${bar.shoppingList.length}</div>
            </div>
        </div>

        <div class="split-grid" style="margin-bottom:24px;">
            <div class="section-block" style="margin:0;">
                <div class="section-header">
                    <h2 class="section-title">${makeable.length > 0 ? 'Ready to Pour (From Your Shelf)' : 'Featured Classics (Stock Your Shelf to Match)'}</h2>
                    <button class="btn btn-ghost btn-sm" id="dashSeeAllCocktails">View All →</button>
                </div>
                <div class="card-grid" style="grid-template-columns:repeat(auto-fill, minmax(230px, 1fr));">
                    ${showcase.map(c => renderCocktailCardHtml(c, store)).join('')}
                </div>
            </div>

            <div class="panel">
                <div class="section-header" style="margin-bottom:10px;">
                    <h2 class="panel-title" style="margin:0;">Next Bottle Unlocks</h2>
                    <span class="badge badge-muted">Top impact</span>
                </div>
                ${recommendations.length === 0 ? `
                    <p style="color:var(--text-secondary);font-size:13px;">Add ingredients to your shelf to see which single bottle unlocks the most new cocktails.</p>
                ` : `
                    <div class="data-list">
                        ${recommendations.map(rec => `
                            <div class="data-row">
                                <div class="data-row-main">
                                    <div class="data-row-title">${escapeHtml(rec.name)}</div>
                                    <div class="data-row-sub">Unlocks ${rec.unlocks.length} cocktail${rec.unlocks.length === 1 ? '' : 's'} (e.g. ${escapeHtml(rec.unlocks.slice(0, 2).map(u => u.name).join(', '))})</div>
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <button class="btn btn-xs btn-secondary" data-rec-shop="${escapeHtml(rec.ingredientId)}">+ Shop</button>
                                    <button class="btn btn-xs btn-primary" data-rec-shelf="${escapeHtml(rec.ingredientId)}">+ Shelf</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    wireCocktailCardClicks(container);
    container.querySelector('#dashAddBottles').onclick = () => setView('shelf');
    container.querySelector('#dashNewCocktail').onclick = () => openCocktailFormModal(null, () => { updateChrome(); renderView(); });
    container.querySelector('#dashSeeAllCocktails').onclick = () => setView('cocktails');

    container.querySelectorAll('.kpi-card[data-jump]').forEach(card => {
        card.onclick = () => {
            const j = card.dataset.jump;
            state.cocktailFilters.canMakeOnly = j === 'cocktails-makeable';
            state.cocktailFilters.almostOnly = j === 'cocktails-almost';
            state.cocktailFilters.favOnly = j === 'cocktails-fav';
            state.cocktailFilters.page = 1;
            if (j === 'shelf') setView('shelf');
            else if (j === 'shopping') setView('shopping');
            else setView('cocktails');
        };
    });

    container.querySelectorAll('[data-rec-shelf]').forEach(btn => {
        btn.onclick = () => {
            store.toggleShelfIngredient(btn.dataset.recShelf);
            showToast('Added to shelf!', 'success');
            updateChrome();
            renderDashboard(container);
        };
    });
    container.querySelectorAll('[data-rec-shop]').forEach(btn => {
        btn.onclick = () => {
            store.addToShoppingList(btn.dataset.recShop);
            showToast('Added to shopping list', 'success');
            updateChrome();
            renderDashboard(container);
        };
    });
}

function renderCocktails(container) {
    const f = state.cocktailFilters;
    const q = state.globalQuery.trim().toLowerCase();
    const shelfSet = store.getShelfSet();

    let list = store.cocktails.filter(c => {
        if (q) {
            const hay = `${c.name} ${c.description || ''} ${c.garnish || ''} ${(c.tags || []).join(' ')} ${(c.ingredients || []).map(i => i.name).join(' ')}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        if (f.tag && !(c.tags || []).includes(f.tag)) return false;
        if (f.glass && c.glass !== f.glass) return false;
        if (f.method && c.method !== f.method) return false;
        if (f.favOnly && !store.user.favorites.includes(c._id)) return false;

        if (f.abvRange) {
            const abv = c.abv ?? store.calculateAbv(c);
            if (f.abvRange === '0' && abv > 0.5) return false;
            if (f.abvRange === 'low' && (abv <= 0.5 || abv >= 12)) return false;
            if (f.abvRange === 'med' && (abv < 12 || abv >= 22)) return false;
            if (f.abvRange === 'high' && abv < 22) return false;
        }

        if (f.canMakeOnly || f.almostOnly) {
            const avail = store.checkCocktailAvailability(c, shelfSet);
            if (f.canMakeOnly && !avail.canMake) return false;
            if (f.almostOnly && !avail.almostMakeable) return false;
        }
        return true;
    });

    list.sort((a, b) => {
        if (f.sort === 'name-desc') return b.name.localeCompare(a.name);
        if (f.sort === 'abv-desc') return (b.abv ?? 0) - (a.abv ?? 0);
        if (f.sort === 'abv-asc') return (a.abv ?? 0) - (b.abv ?? 0);
        if (f.sort === 'rating-desc') return (store.user.ratings[b._id]?.rating || 0) - (store.user.ratings[a._id]?.rating || 0);
        if (f.sort === 'missing-asc') {
            return store.checkCocktailAvailability(a, shelfSet).missingCount - store.checkCocktailAvailability(b, shelfSet).missingCount;
        }
        return a.name.localeCompare(b.name);
    });

    const totalPages = Math.max(1, Math.ceil(list.length / f.perPage));
    if (f.page > totalPages) f.page = totalPages;
    const start = (f.page - 1) * f.perPage;
    const pageItems = list.slice(start, start + f.perPage);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Cocktails</h1>
                <p class="page-subtitle">Showing ${list.length} of ${store.cocktails.length} recipes</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" id="btnNewCocktail">+ New Cocktail</button>
            </div>
        </div>

        <div class="filter-bar">
            <button class="filter-chip success ${f.canMakeOnly ? 'active' : ''}" id="chipCanMake">✓ Can Make Now</button>
            <button class="filter-chip ${f.almostOnly ? 'active' : ''}" id="chipAlmost">Missing 1</button>
            <button class="filter-chip ${f.favOnly ? 'active' : ''}" id="chipFav">★ Favorites</button>

            <select class="filter-select" id="selTag">
                <option value="">All Tags</option>
                ${store.allTags.map(t => `<option value="${escapeHtml(t)}" ${f.tag === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
            <select class="filter-select" id="selGlass">
                <option value="">All Glasses</option>
                ${store.glasses.map(g => `<option value="${escapeHtml(g.name)}" ${f.glass === g.name ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
            </select>
            <select class="filter-select" id="selMethod">
                <option value="">All Methods</option>
                ${store.methods.map(m => `<option value="${escapeHtml(m.name)}" ${f.method === m.name ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
            </select>
            <select class="filter-select" id="selAbv">
                <option value="">Any ABV</option>
                <option value="0" ${f.abvRange === '0' ? 'selected' : ''}>Non-Alcoholic (0%)</option>
                <option value="low" ${f.abvRange === 'low' ? 'selected' : ''}>Light (&lt;12%)</option>
                <option value="med" ${f.abvRange === 'med' ? 'selected' : ''}>Medium (12–22%)</option>
                <option value="high" ${f.abvRange === 'high' ? 'selected' : ''}>Spirit-Forward (22%+)</option>
            </select>
            <select class="filter-select" id="selSort">
                <option value="name-asc" ${f.sort === 'name-asc' ? 'selected' : ''}>Name A–Z</option>
                <option value="name-desc" ${f.sort === 'name-desc' ? 'selected' : ''}>Name Z–A</option>
                <option value="missing-asc" ${f.sort === 'missing-asc' ? 'selected' : ''}>Closest to Make</option>
                <option value="abv-desc" ${f.sort === 'abv-desc' ? 'selected' : ''}>ABV High–Low</option>
                <option value="abv-asc" ${f.sort === 'abv-asc' ? 'selected' : ''}>ABV Low–High</option>
                <option value="rating-desc" ${f.sort === 'rating-desc' ? 'selected' : ''}>Top Rated</option>
            </select>
            <button class="btn btn-ghost btn-sm" id="btnResetFilters">Reset</button>
        </div>

        ${pageItems.length === 0 ? `
            <div class="panel" style="text-align:center;padding:48px;">
                <p style="color:var(--text-secondary);margin-bottom:12px;">No cocktails match your current filters.</p>
                <button class="btn btn-secondary" id="btnEmptyReset">Clear Filters</button>
            </div>
        ` : `
            <div class="card-grid">
                ${pageItems.map(c => renderCocktailCardHtml(c, store)).join('')}
            </div>
            <div class="pagination-bar">
                <span style="color:var(--text-secondary);font-size:13px;">Page ${f.page} of ${totalPages}</span>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary btn-sm" id="btnPrevPage" ${f.page <= 1 ? 'disabled' : ''}>← Prev</button>
                    <button class="btn btn-secondary btn-sm" id="btnNextPage" ${f.page >= totalPages ? 'disabled' : ''}>Next →</button>
                </div>
            </div>
        `}
    `;

    wireCocktailCardClicks(container);
    container.querySelector('#btnNewCocktail').onclick = () => openCocktailFormModal(null, () => { updateChrome(); renderCocktails(container); });

    container.querySelector('#chipCanMake').onclick = () => { f.canMakeOnly = !f.canMakeOnly; if (f.canMakeOnly) f.almostOnly = false; f.page = 1; renderCocktails(container); };
    container.querySelector('#chipAlmost').onclick = () => { f.almostOnly = !f.almostOnly; if (f.almostOnly) f.canMakeOnly = false; f.page = 1; renderCocktails(container); };
    container.querySelector('#chipFav').onclick = () => { f.favOnly = !f.favOnly; f.page = 1; renderCocktails(container); };
    container.querySelector('#selTag').onchange = (e) => { f.tag = e.target.value; f.page = 1; renderCocktails(container); };
    container.querySelector('#selGlass').onchange = (e) => { f.glass = e.target.value; f.page = 1; renderCocktails(container); };
    container.querySelector('#selMethod').onchange = (e) => { f.method = e.target.value; f.page = 1; renderCocktails(container); };
    container.querySelector('#selAbv').onchange = (e) => { f.abvRange = e.target.value; f.page = 1; renderCocktails(container); };
    container.querySelector('#selSort').onchange = (e) => { f.sort = e.target.value; f.page = 1; renderCocktails(container); };

    const resetAll = () => {
        state.cocktailFilters = { ...state.cocktailFilters, canMakeOnly: false, almostOnly: false, favOnly: false, tag: '', glass: '', method: '', abvRange: '', sort: 'name-asc', page: 1 };
        state.globalQuery = '';
        document.getElementById('globalSearch').value = '';
        renderCocktails(container);
    };
    container.querySelector('#btnResetFilters').onclick = resetAll;
    const emptyBtn = container.querySelector('#btnEmptyReset');
    if (emptyBtn) emptyBtn.onclick = resetAll;

    const prevBtn = container.querySelector('#btnPrevPage');
    const nextBtn = container.querySelector('#btnNextPage');
    if (prevBtn) prevBtn.onclick = () => { if (f.page > 1) { f.page--; renderCocktails(container); document.getElementById('mainViewport').scrollTop = 0; } };
    if (nextBtn) nextBtn.onclick = () => { if (f.page < totalPages) { f.page++; renderCocktails(container); document.getElementById('mainViewport').scrollTop = 0; } };
}

function renderShelf(container) {
    const sf = state.shelfFilter;
    const shelfSet = store.getShelfSet();
    const q = (sf.query || state.globalQuery).trim().toLowerCase();

    const filtered = store.ingredients.filter(ing => {
        const inShelf = shelfSet.has(ing._id);
        if (sf.tab === 'in-shelf' && !inShelf) return false;
        if (sf.tab === 'missing' && inShelf) return false;
        if (sf.category && ing.category !== sf.category) return false;
        if (q && !`${ing.name} ${ing.category || ''} ${ing.origin || ''}`.toLowerCase().includes(q)) return false;
        return true;
    });

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">My Shelf — ${escapeHtml(store.getActiveBar().name)}</h1>
                <p class="page-subtitle">${shelfSet.size} ingredients in stock • Toggle bottles to update cocktail availability in real time</p>
            </div>
        </div>

        <div class="filter-bar">
            <button class="filter-chip ${sf.tab === 'all' ? 'active' : ''}" data-shelf-tab="all">All (${store.ingredients.length})</button>
            <button class="filter-chip success ${sf.tab === 'in-shelf' ? 'active' : ''}" data-shelf-tab="in-shelf">In Shelf (${shelfSet.size})</button>
            <button class="filter-chip ${sf.tab === 'missing' ? 'active' : ''}" data-shelf-tab="missing">Not in Shelf (${store.ingredients.length - shelfSet.size})</button>

            <input type="search" id="shelfSearch" class="filter-input" placeholder="Filter shelf ingredients..." value="${escapeHtml(sf.query)}">
            <select id="shelfCat" class="filter-select">
                <option value="">All Categories</option>
                ${store.categories.map(c => `<option value="${escapeHtml(c.name)}" ${sf.category === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
        </div>

        <div class="ingredient-grid">
            ${filtered.map(ing => {
                const inShelf = shelfSet.has(ing._id);
                const img = getPrimaryImage(ing);
                return `
                    <div class="ingredient-card ${inShelf ? 'in-shelf' : ''}">
                        ${img ? `<img class="ingredient-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(ing.name)}" loading="lazy">` : `<div class="ingredient-thumb" style="display:flex;align-items:center;justify-content:center;">🍾</div>`}
                        <div class="ingredient-info" data-open-ing="${escapeHtml(ing._id)}">
                            <div class="ingredient-name">${escapeHtml(ing.name)}</div>
                            <div class="ingredient-sub">${escapeHtml(ing.category || 'Other')} • ${ing.strength ?? 0}% ABV</div>
                        </div>
                        <button class="btn btn-sm ${inShelf ? 'btn-success' : 'btn-secondary'}" data-toggle-shelf="${escapeHtml(ing._id)}">
                            ${inShelf ? '✓ In Shelf' : '+ Add'}
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelectorAll('[data-shelf-tab]').forEach(btn => {
        btn.onclick = () => { sf.tab = btn.dataset.shelfTab; renderShelf(container); };
    });
    container.querySelector('#shelfSearch').oninput = (e) => { sf.query = e.target.value; renderShelf(container); };
    container.querySelector('#shelfCat').onchange = (e) => { sf.category = e.target.value; renderShelf(container); };
    container.querySelectorAll('[data-toggle-shelf]').forEach(btn => {
        btn.onclick = () => {
            store.toggleShelfIngredient(btn.dataset.toggleShelf);
            updateChrome();
            renderShelf(container);
        };
    });
    container.querySelectorAll('[data-open-ing]').forEach(el => {
        el.onclick = () => openIngredientDetailModal(el.dataset.openIng, () => { updateChrome(); renderShelf(container); });
    });
}

function renderIngredients(container) {
    const inf = state.ingFilter;
    const q = (inf.query || state.globalQuery).trim().toLowerCase();
    const shelfSet = store.getShelfSet();

    const list = store.ingredients.filter(ing => {
        if (inf.category && ing.category !== inf.category) return false;
        if (q && !`${ing.name} ${ing.category || ''} ${ing.origin || ''}`.toLowerCase().includes(q)) return false;
        return true;
    });

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Ingredients Catalog</h1>
                <p class="page-subtitle">Showing ${list.length} of ${store.ingredients.length} ingredients</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-primary" id="btnNewIng">+ New Ingredient</button>
            </div>
        </div>

        <div class="filter-bar">
            <input type="search" id="ingSearch" class="filter-input" placeholder="Search ingredients..." value="${escapeHtml(inf.query)}">
            <select id="ingCat" class="filter-select">
                <option value="">All Categories</option>
                ${store.categories.map(c => `<option value="${escapeHtml(c.name)}" ${inf.category === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
        </div>

        <div class="ingredient-grid">
            ${list.map(ing => {
                const img = getPrimaryImage(ing);
                const inShelf = shelfSet.has(ing._id);
                return `
                    <div class="ingredient-card ${inShelf ? 'in-shelf' : ''}">
                        ${img ? `<img class="ingredient-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(ing.name)}" loading="lazy">` : `<div class="ingredient-thumb" style="display:flex;align-items:center;justify-content:center;">🧪</div>`}
                        <div class="ingredient-info" data-open-ing="${escapeHtml(ing._id)}">
                            <div class="ingredient-name">${escapeHtml(ing.name)}</div>
                            <div class="ingredient-sub">${escapeHtml(ing.category || 'Other')} • ${ing.strength ?? 0}% ABV${ing.origin ? ` • ${escapeHtml(ing.origin)}` : ''}</div>
                        </div>
                        <button class="btn btn-xs btn-secondary" data-open-ing="${escapeHtml(ing._id)}">Details</button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelector('#btnNewIng').onclick = () => openIngredientFormModal(() => { updateChrome(); renderIngredients(container); });
    container.querySelector('#ingSearch').oninput = (e) => { inf.query = e.target.value; renderIngredients(container); };
    container.querySelector('#ingCat').onchange = (e) => { inf.category = e.target.value; renderIngredients(container); };
    container.querySelectorAll('[data-open-ing]').forEach(el => {
        el.onclick = () => openIngredientDetailModal(el.dataset.openIng, () => { updateChrome(); renderIngredients(container); });
    });
}

function renderProducts(container) {
    const pf = state.productFilter;
    const q = (pf.query || state.globalQuery).trim().toLowerCase();

    const list = store.products.filter(p => {
        if (pf.category && p.category !== pf.category) return false;
        if (q && !`${p.name} ${p.category} ${p.stockId}`.toLowerCase().includes(q)) return false;
        return true;
    });

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Coasters Tavern — Product List</h1>
                <p class="page-subtitle">Loaded from beverage_product_list.txt • ${list.length} of ${store.products.length} products (${store.productLineItemCount} pour options across ${store.productCategories.length} categories)</p>
            </div>
        </div>

        <div class="filter-bar">
            <input type="search" id="prodSearch" class="filter-input" placeholder="Search product name or stock ID..." value="${escapeHtml(pf.query)}">
            <select id="prodCat" class="filter-select">
                <option value="">All Categories (${store.productCategories.length})</option>
                ${store.productCategories.map(c => `<option value="${escapeHtml(c)}" ${pf.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
        </div>

        <div class="ingredient-grid">
            ${list.map(p => {
                const pours = p.variants
                    .map(v => `${v.size}: $${v.price.toFixed(2)}`)
                    .join(' • ');
                return `
                    <div class="ingredient-card" style="flex-direction:column;align-items:stretch;gap:8px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <div class="ingredient-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                            <span class="badge badge-muted">${escapeHtml(p.stockId)}</span>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <span class="badge badge-accent">${escapeHtml(p.category)}</span>
                        </div>
                        <div class="ingredient-sub" title="${escapeHtml(pours)}">${escapeHtml(pours)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelector('#prodSearch').oninput = (e) => { pf.query = e.target.value; renderProducts(container); };
    container.querySelector('#prodCat').onchange = (e) => { pf.category = e.target.value; renderProducts(container); };
}

function renderShopping(container) {
    const bar = store.getActiveBar();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Shopping List — ${escapeHtml(bar.name)}</h1>
                <p class="page-subtitle">${bar.shoppingList.length} item${bar.shoppingList.length === 1 ? '' : 's'} to buy</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary" id="btnExportShopMd">Export Markdown</button>
                <button class="btn btn-secondary" onclick="window.print()">Print List</button>
            </div>
        </div>

        <div class="split-grid">
            <div class="panel">
                <div class="panel-title">Items to Purchase</div>
                ${bar.shoppingList.length === 0 ? `
                    <p style="color:var(--text-secondary);">Your shopping list is empty. Add missing ingredients from any cocktail recipe or from the right panel.</p>
                ` : `
                    <div class="data-list">
                        ${bar.shoppingList.map(item => {
                            const ing = store.ingredientMap.get(item.ingredientId);
                            const name = ing?.name || item.ingredientId;
                            return `
                                <div class="data-row">
                                    <div class="data-row-main">
                                        <div class="data-row-title">${escapeHtml(name)} (×${item.quantity || 1})</div>
                                        <div class="data-row-sub">${escapeHtml(ing?.category || '')}</div>
                                    </div>
                                    <div style="display:flex;gap:6px;" class="no-print">
                                        <button class="btn btn-success btn-xs" data-shop-buy="${escapeHtml(item.ingredientId)}">✓ Purchased (Move to Shelf)</button>
                                        <button class="btn btn-danger btn-xs" data-shop-del="${escapeHtml(item.ingredientId)}">✕</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <div class="panel no-print">
                <div class="panel-title">Quick Add Ingredient</div>
                <div style="display:flex;gap:8px;margin-bottom:14px;">
                    <select id="shopQuickSelect" class="form-control">
                        ${store.ingredients.map(i => `<option value="${escapeHtml(i._id)}">${escapeHtml(i.name)}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary" id="btnShopQuickAdd">Add</button>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#btnShopQuickAdd').onclick = () => {
        const id = container.querySelector('#shopQuickSelect').value;
        store.addToShoppingList(id);
        showToast('Added to shopping list', 'success');
        updateChrome();
        renderShopping(container);
    };
    container.querySelectorAll('[data-shop-buy]').forEach(btn => {
        btn.onclick = () => {
            store.markShoppingItemPurchased(btn.dataset.shopBuy);
            showToast('Moved to your Bar Shelf!', 'success');
            updateChrome();
            renderShopping(container);
        };
    });
    container.querySelectorAll('[data-shop-del]').forEach(btn => {
        btn.onclick = () => {
            store.removeFromShoppingList(btn.dataset.shopDel);
            updateChrome();
            renderShopping(container);
        };
    });
    container.querySelector('#btnExportShopMd').onclick = () => {
        const md = `# Shopping List — ${bar.name}\n\n` + bar.shoppingList.map(i => `- [ ] ${store.ingredientMap.get(i.ingredientId)?.name || i.ingredientId} (x${i.quantity || 1})`).join('\n');
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopping-list-${bar.id}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };
}

function renderCollections(container) {
    const cols = store.user.collections;
    const selected = cols.find(c => c.id === state.selectedCollectionId) || cols[0] || null;
    if (selected) state.selectedCollectionId = selected.id;

    if (state.menuMode && selected) {
        const items = selected.cocktailIds.map(id => store.cocktailMap.get(id)).filter(Boolean);
        container.innerHTML = `
            <div class="page-header no-print">
                <div>
                    <h1 class="page-title">Public Bar Menu Preview</h1>
                    <p class="page-subtitle">${escapeHtml(selected.name)}</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" id="btnExitMenu">← Back to Collections</button>
                    <button class="btn btn-primary" onclick="window.print()">Print Menu</button>
                </div>
            </div>
            <div class="menu-sheet">
                <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid var(--accent);padding-bottom:16px;">
                    <h1 style="font-size:32px;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(store.getActiveBar().name)}</h1>
                    <p style="color:var(--accent);font-size:15px;">${escapeHtml(selected.name)}${selected.description ? ` — ${escapeHtml(selected.description)}` : ''}</p>
                </div>
                ${items.map(c => `
                    <div class="menu-item-row">
                        <div>
                            <div style="font-size:17px;font-weight:700;">${escapeHtml(c.name)}</div>
                            <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml((c.ingredients || []).map(i => i.name).join(' • '))}</div>
                        </div>
                        <div style="font-family:var(--font-mono);color:var(--accent);white-space:nowrap;">${c.abv ?? store.calculateAbv(c)}% ABV</div>
                    </div>
                `).join('')}
            </div>
        `;
        container.querySelector('#btnExitMenu').onclick = () => { state.menuMode = false; renderCollections(container); };
        return;
    }

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Collections &amp; Bar Menus</h1>
                <p class="page-subtitle">Organize custom cocktail menus and printable drink lists</p>
            </div>
            <div class="page-actions">
                <input type="text" id="newColName" class="filter-input" placeholder="New collection name...">
                <button class="btn btn-primary" id="btnCreateCol">+ Create Collection</button>
            </div>
        </div>

        <div class="split-grid" style="grid-template-columns:300px 1fr;">
            <div class="panel">
                <div class="panel-title">Your Collections (${cols.length})</div>
                <div class="data-list">
                    ${cols.length === 0 ? `<p style="color:var(--text-secondary);font-size:13px;">No collections yet. Create one above.</p>` : cols.map(col => `
                        <div class="data-row" style="cursor:pointer;${selected?.id === col.id ? 'border-color:var(--accent);' : ''}" data-select-col="${escapeHtml(col.id)}">
                            <div class="data-row-main">
                                <div class="data-row-title">${escapeHtml(col.name)}</div>
                                <div class="data-row-sub">${col.cocktailIds.length} cocktails</div>
                            </div>
                            <button class="btn btn-danger btn-xs" data-del-col="${escapeHtml(col.id)}">✕</button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="panel">
                ${!selected ? `<p style="color:var(--text-secondary);">Select or create a collection to manage its cocktails and generate a Bar Menu.</p>` : `
                    <div class="section-header">
                        <h2 class="panel-title" style="margin:0;">${escapeHtml(selected.name)}</h2>
                        <button class="btn btn-primary btn-sm" id="btnOpenMenuMode">Open Bar Menu View</button>
                    </div>
                    <div class="card-grid" style="grid-template-columns:repeat(auto-fill, minmax(230px, 1fr));margin-top:12px;">
                        ${selected.cocktailIds.map(id => store.cocktailMap.get(id)).filter(Boolean).map(c => renderCocktailCardHtml(c, store)).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    wireCocktailCardClicks(container);
    container.querySelector('#btnCreateCol').onclick = () => {
        const name = container.querySelector('#newColName').value.trim();
        if (!name) return;
        state.selectedCollectionId = store.createCollection(name);
        showToast(`Created collection "${name}"`, 'success');
        renderCollections(container);
    };
    container.querySelectorAll('[data-select-col]').forEach(row => {
        row.onclick = (e) => {
            if (e.target.closest('[data-del-col]')) return;
            state.selectedCollectionId = row.dataset.selectCol;
            renderCollections(container);
        };
    });
    container.querySelectorAll('[data-del-col]').forEach(btn => {
        btn.onclick = () => {
            store.deleteCollection(btn.dataset.delCol);
            state.selectedCollectionId = null;
            renderCollections(container);
        };
    });
    const menuBtn = container.querySelector('#btnOpenMenuMode');
    if (menuBtn) menuBtn.onclick = () => { state.menuMode = true; renderCollections(container); };
}

function renderCalculators(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Bar Calculators</h1>
                <p class="page-subtitle">ABV &amp; Dilution, Batch Scaling, and Syrup Brix/Sugar Calculators</p>
            </div>
        </div>

        <div class="calc-grid">
            <div class="panel">
                <div class="panel-title">Cocktail ABV &amp; Dilution Calculator</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Spirit Volume (ml)</label>
                        <input type="number" id="calcAbvVol1" class="form-control" value="60">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Spirit ABV (%)</label>
                        <input type="number" id="calcAbvStr1" class="form-control" value="40">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modifier / Liqueur (ml)</label>
                        <input type="number" id="calcAbvVol2" class="form-control" value="30">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Modifier ABV (%)</label>
                        <input type="number" id="calcAbvStr2" class="form-control" value="20">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Non-Alc Mixers (ml)</label>
                        <input type="number" id="calcAbvMix" class="form-control" value="30">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Method Dilution (%)</label>
                        <select id="calcAbvDil" class="form-control">
                            ${store.methods.map(m => `<option value="${m.dilution_percentage}">${escapeHtml(m.name)} (${m.dilution_percentage}%)</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="data-row" style="margin-top:8px;">
                    <span>Final Volume: <strong id="resAbvVol">0 ml</strong></span>
                    <span style="color:var(--accent);font-size:18px;font-weight:700;" id="resAbvPct">0% ABV</span>
                </div>
            </div>

            <div class="panel">
                <div class="panel-title">Simple Syrup &amp; Brix Calculator</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Sugar Weight (g)</label>
                        <input type="number" id="calcSugG" class="form-control" value="500">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Water Volume (ml)</label>
                        <input type="number" id="calcWatMl" class="form-control" value="500">
                    </div>
                </div>
                <div class="data-row" style="margin-top:8px;">
                    <span>Ratio: <strong id="resSyrRatio">1:1</strong></span>
                    <span>Brix: <strong id="resSyrBrix">50°Bx</strong></span>
                    <span style="color:var(--success);font-weight:700;" id="resSyrYield">812 ml</span>
                </div>
            </div>
        </div>
    `;

    const updateAbv = () => {
        const v1 = Number(container.querySelector('#calcAbvVol1').value) || 0;
        const s1 = Number(container.querySelector('#calcAbvStr1').value) || 0;
        const v2 = Number(container.querySelector('#calcAbvVol2').value) || 0;
        const s2 = Number(container.querySelector('#calcAbvStr2').value) || 0;
        const vm = Number(container.querySelector('#calcAbvMix').value) || 0;
        const dil = Number(container.querySelector('#calcAbvDil').value) || 0;
        const baseVol = v1 + v2 + vm;
        const finalVol = baseVol * (1 + dil / 100);
        const alc = v1 * (s1 / 100) + v2 * (s2 / 100);
        const abv = finalVol > 0 ? (alc / finalVol) * 100 : 0;
        container.querySelector('#resAbvVol').textContent = `${Math.round(finalVol * 10) / 10} ml`;
        container.querySelector('#resAbvPct').textContent = `${Math.round(abv * 10) / 10}% ABV`;
    };
    ['#calcAbvVol1', '#calcAbvStr1', '#calcAbvVol2', '#calcAbvStr2', '#calcAbvMix', '#calcAbvDil'].forEach(id => {
        container.querySelector(id).oninput = updateAbv;
    });
    updateAbv();

    const updateSyr = () => {
        const g = Number(container.querySelector('#calcSugG').value) || 0;
        const ml = Number(container.querySelector('#calcWatMl').value) || 0;
        const totalW = g + ml;
        const brix = totalW > 0 ? (g / totalW) * 100 : 0;
        const yieldMl = ml + g * 0.625;
        const ratio = ml > 0 ? (Math.round((g / ml) * 100) / 100) : 0;
        container.querySelector('#resSyrRatio').textContent = `${ratio}:1`;
        container.querySelector('#resSyrBrix').textContent = `${Math.round(brix * 10) / 10}°Bx`;
        container.querySelector('#resSyrYield').textContent = `~${Math.round(yieldMl)} ml`;
    };
    ['#calcSugG', '#calcWatMl'].forEach(id => {
        container.querySelector(id).oninput = updateSyr;
    });
    updateSyr();
}

function renderReference(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Bar Reference</h1>
                <p class="page-subtitle">Official Bar Assistant Glassware, Methods, Utensils &amp; Taste Descriptors</p>
            </div>
        </div>

        <div class="calc-grid">
            <div class="panel">
                <div class="panel-title">Glassware (${store.glasses.length})</div>
                <div class="data-list" style="max-height:380px;overflow-y:auto;">
                    ${store.glasses.map(g => `
                        <div class="data-row">
                            <div class="data-row-main">
                                <div class="data-row-title">${escapeHtml(g.name)}</div>
                                <div class="data-row-sub" style="white-space:normal;">${escapeHtml(g.description || '')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="panel">
                <div class="panel-title">Methods &amp; Dilution (${store.methods.length})</div>
                <div class="data-list" style="margin-bottom:18px;">
                    ${store.methods.map(m => `
                        <div class="data-row">
                            <div class="data-row-title">${escapeHtml(m.name)}</div>
                            <span class="badge badge-accent">${m.dilution_percentage}% dilution</span>
                        </div>
                    `).join('')}
                </div>

                <div class="panel-title">Utensils (${store.utensils.length})</div>
                <div class="data-list" style="max-height:220px;overflow-y:auto;">
                    ${store.utensils.map(u => `
                        <div class="data-row">
                            <div class="data-row-main">
                                <div class="data-row-title">${escapeHtml(u.name)}</div>
                                <div class="data-row-sub" style="white-space:normal;">${escapeHtml(u.description || '')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function bootstrap() {
    startClock();
    try {
        await store.init();
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('viewContainer').classList.remove('hidden');

        // Wire global chrome
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.onclick = () => setView(btn.dataset.view);
        });
        document.querySelectorAll('[data-nav]').forEach(el => {
            el.onclick = (e) => { e.preventDefault(); setView(el.dataset.nav); };
        });
        document.getElementById('barSelect').onchange = (e) => {
            store.switchBar(e.target.value);
            updateChrome();
            renderView();
        };
        document.getElementById('btnManageBars').onclick = () => openManageBarsModal(() => { updateChrome(); renderView(); });
        document.getElementById('btnQrShare').onclick = () => {
            const base = window.location.href.split('#')[0];
            openQrModal('Open Bar Assistant on Another Device', `${base}#${state.view}`);
        };
        document.getElementById('btnBackup').onclick = () => openBackupModal(() => { updateChrome(); renderView(); });
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.onclick = () => {
                store.user.unit = btn.dataset.unit;
                store.saveUserState();
                updateChrome();
                renderView();
            };
        });

        const searchInput = document.getElementById('globalSearch');
        searchInput.oninput = (e) => {
            state.globalQuery = e.target.value;
            if (state.view === 'dashboard' && state.globalQuery.trim()) {
                state.view = 'cocktails';
                updateChrome();
            }
            state.cocktailFilters.page = 1;
            renderView();
        };

        document.getElementById('btnSurpriseMe').onclick = () => {
            const shelfSet = store.getShelfSet();
            const makeable = store.cocktails.filter(c => store.checkCocktailAvailability(c, shelfSet).canMake);
            const pool = makeable.length > 0 ? makeable : store.cocktails;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) openCocktailDetailModal(pick._id, () => { updateChrome(); renderView(); });
        };

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            if (e.key === '/') {
                e.preventDefault();
                searchInput.focus();
            }
        });

        const applyHash = () => {
            const h = window.location.hash.replace(/^#/, '');
            if (!h) return;
            if (h.startsWith('cocktail=')) {
                const cId = decodeURIComponent(h.slice('cocktail='.length));
                state.view = 'cocktails';
                updateChrome();
                renderView();
                openCocktailDetailModal(cId, () => { updateChrome(); renderView(); });
                return;
            }
            const validViews = ['dashboard', 'cocktails', 'shelf', 'ingredients', 'products', 'shopping', 'collections', 'calculators', 'reference'];
            if (validViews.includes(h)) {
                state.view = h;
            }
        };

        applyHash();
        updateChrome();
        renderView();
        window.addEventListener('hashchange', () => { applyHash(); updateChrome(); renderView(); });
    } catch (err) {
        console.error(err);
        document.getElementById('loadingState').innerHTML = `<p style="color:var(--danger);">Failed to load Bar Assistant data: ${escapeHtml(err.message)}</p>`;
    }
}

bootstrap();
