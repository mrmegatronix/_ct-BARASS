import { store } from './store.js';
import { escapeHtml, getPrimaryImage, showToast, slugify } from './utils.js';

const modalRoot = () => document.getElementById('modalRoot');

export function closeModal() {
    const root = modalRoot();
    if (!root) return;
    root.classList.add('hidden');
    root.innerHTML = '';
}

function mountModal(html, small = false) {
    const root = modalRoot();
    root.innerHTML = `<div class="modal-card ${small ? 'modal-sm' : ''}">${html}</div>`;
    root.classList.remove('hidden');
    root.onclick = (e) => {
        if (e.target === root) closeModal();
    };
    const closeBtn = root.querySelector('[data-close-modal]');
    if (closeBtn) closeBtn.onclick = closeModal;
}

export function openCocktailDetailModal(cocktailId, onRefresh) {
    const c = store.cocktailMap.get(cocktailId);
    if (!c) return;

    let scale = 1;
    const renderBody = () => {
        const avail = store.checkCocktailAvailability(c);
        const img = getPrimaryImage(c);
        const isFav = store.user.favorites.includes(c._id);
        const ratingObj = store.user.ratings[c._id] || { rating: 0, note: '' };
        const calcAbv = store.calculateAbv(c);
        const abv = c.abv !== null && c.abv !== undefined ? c.abv : calcAbv;

        mountModal(`
            <div class="modal-header">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <h2 class="modal-title">${escapeHtml(c.name)}</h2>
                    ${avail.canMake
                        ? `<span class="badge badge-success">Can Make</span>`
                        : `<span class="badge badge-warn">Missing ${avail.missingCount}</span>`
                    }
                </div>
                <div style="display:flex;align-items:center;gap:8px;" class="no-print">
                    <button class="btn btn-secondary btn-sm" id="btnFavToggle">${isFav ? '★ Favorited' : '☆ Favorite'}</button>
                    <button class="btn btn-secondary btn-sm" id="btnEditCocktail">Edit</button>
                    <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
                </div>
            </div>
            <div class="modal-body">
                <div class="detail-hero">
                    <div class="detail-image-box">
                        ${img
                            ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}">`
                            : `<div class="cocktail-thumb-placeholder">🍸</div>`
                        }
                    </div>
                    <div>
                        <p style="color:var(--text-secondary);margin-bottom:10px;">${escapeHtml(c.description || 'No description provided.')}</p>
                        <div class="detail-meta-grid">
                            <div class="meta-pill-box">
                                <div class="meta-pill-label">ABV</div>
                                <div class="meta-pill-val">${abv}% (Est. ${calcAbv}%)</div>
                            </div>
                            <div class="meta-pill-box">
                                <div class="meta-pill-label">Glass</div>
                                <div class="meta-pill-val">${escapeHtml(c.glass || 'Any')}</div>
                            </div>
                            <div class="meta-pill-box">
                                <div class="meta-pill-label">Method</div>
                                <div class="meta-pill-val">${escapeHtml(c.method || 'Build')}</div>
                            </div>
                            <div class="meta-pill-box">
                                <div class="meta-pill-label">Year / Author</div>
                                <div class="meta-pill-val">${escapeHtml(c.year || c.author || 'Classic')}</div>
                            </div>
                        </div>

                        ${c.garnish ? `<div style="margin-bottom:8px;"><strong>Garnish:</strong> <span style="color:var(--text-secondary);">${escapeHtml(c.garnish)}</span></div>` : ''}
                        ${(c.utensils && c.utensils.length) ? `<div style="margin-bottom:8px;"><strong>Utensils:</strong> <span style="color:var(--text-secondary);">${escapeHtml(c.utensils.join(', '))}</span></div>` : ''}
                        ${c.source ? `<div style="margin-bottom:10px;"><strong>Source:</strong> <a href="${escapeHtml(c.source)}" target="_blank" rel="noopener" style="color:var(--accent);">${escapeHtml(c.source)}</a></div>` : ''}

                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${(c.tags || []).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="split-grid">
                    <div class="panel">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
                            <div class="panel-title" style="margin:0;">Ingredients</div>
                            <div style="display:flex;align-items:center;gap:6px;" class="no-print">
                                <span style="font-size:12px;color:var(--text-muted);">Scale:</span>
                                ${[1, 2, 3, 4].map(s => `<button class="btn btn-xs ${scale === s ? 'btn-primary' : 'btn-secondary'}" data-scale="${s}">${s}x</button>`).join('')}
                            </div>
                        </div>
                        <div>
                            ${(c.ingredients || []).map(ing => {
                                const have = store.hasIngredientInShelf(ing._id, store.getShelfSet()) ||
                                    (ing.substitutes || []).some(sub => store.hasIngredientInShelf(typeof sub === 'string' ? sub : sub._id, store.getShelfSet()));
                                const amtStr = store.formatAmount(ing.amount, ing.units, scale);
                                const subsText = (ing.substitutes && ing.substitutes.length)
                                    ? ` (Sub: ${ing.substitutes.map(s => typeof s === 'string' ? s : s.name).join(', ')})`
                                    : '';
                                return `
                                    <div class="recipe-ing-row ${have ? 'have' : 'missing'}">
                                        <div style="min-width:0;flex:1;">
                                            <div style="font-weight:600;">
                                                <a href="#" data-open-ing="${escapeHtml(ing._id)}" style="color:inherit;text-decoration:none;">${escapeHtml(ing.name)}</a>
                                                ${ing.optional ? `<span class="badge badge-muted" style="margin-left:6px;">Optional</span>` : ''}
                                            </div>
                                            ${ing.note || subsText ? `<div style="font-size:11px;color:var(--text-secondary);">${escapeHtml((ing.note || '') + subsText)}</div>` : ''}
                                        </div>
                                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                                            <span style="font-family:var(--font-mono);font-weight:600;">${escapeHtml(amtStr)}</span>
                                            ${have
                                                ? `<span class="badge badge-success">In Shelf</span>`
                                                : `<button class="btn btn-xs btn-secondary no-print" data-add-shop="${escapeHtml(ing._id)}" title="Add to Shopping List">+ Shop</button>`
                                            }
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        ${avail.missing.length > 0 ? `
                            <button class="btn btn-primary btn-sm no-print" id="btnAddAllMissing" style="margin-top:10px;">
                                Add ${avail.missing.length} Missing to Shopping List
                            </button>
                        ` : ''}
                    </div>

                    <div class="panel">
                        <div class="panel-title">Instructions</div>
                        <p style="white-space:pre-line;color:var(--text-primary);margin-bottom:16px;">${escapeHtml(c.instructions || 'No instructions provided.')}</p>

                        <div class="no-print" style="border-top:1px solid var(--border);padding-top:14px;">
                            <div class="panel-title" style="margin-bottom:8px;">Rating &amp; Tasting Notes</div>
                            <div class="star-rating" id="starRating" style="margin-bottom:8px;">
                                ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn ${n <= ratingObj.rating ? 'filled' : ''}" data-star="${n}">★</button>`).join('')}
                            </div>
                            <textarea id="cocktailNoteInput" class="form-control" placeholder="Add personal tasting notes...">${escapeHtml(ratingObj.note || '')}</textarea>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;">
                                <button class="btn btn-secondary btn-sm" id="btnSaveNote">Save Note</button>
                                ${store.user.collections.length ? `
                                    <select id="addCollectionSelect" class="filter-select" style="max-width:200px;">
                                        <option value="">+ Add to Collection...</option>
                                        ${store.user.collections.map(col => `
                                            <option value="${escapeHtml(col.id)}">${col.cocktailIds.includes(c._id) ? '✓ ' : ''}${escapeHtml(col.name)}</option>
                                        `).join('')}
                                    </select>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer no-print">
                <button class="btn btn-danger btn-sm" id="btnDeleteCocktail" style="margin-right:auto;">Delete</button>
                <button class="btn btn-secondary btn-sm" id="btnExportCocktailJson">Export JSON</button>
                <button class="btn btn-secondary btn-sm" onclick="window.print()">Print Recipe</button>
                <button class="btn btn-primary btn-sm" data-close-modal>Close</button>
            </div>
        `);

        const root = modalRoot();
        root.querySelector('#btnFavToggle').onclick = () => {
            const added = store.toggleFavorite(c._id);
            showToast(added ? 'Added to favorites' : 'Removed from favorites', 'success');
            renderBody();
            onRefresh?.();
        };
        root.querySelector('#btnEditCocktail').onclick = () => openCocktailFormModal(c, onRefresh);
        root.querySelectorAll('[data-scale]').forEach(btn => {
            btn.onclick = () => {
                scale = Number(btn.dataset.scale);
                renderBody();
            };
        });
        root.querySelectorAll('[data-add-shop]').forEach(btn => {
            btn.onclick = () => {
                store.addToShoppingList(btn.dataset.addShop);
                showToast('Added to shopping list', 'success');
                onRefresh?.();
            };
        });
        root.querySelectorAll('[data-open-ing]').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                openIngredientDetailModal(link.dataset.openIng, onRefresh);
            };
        });
        const addAllBtn = root.querySelector('#btnAddAllMissing');
        if (addAllBtn) {
            addAllBtn.onclick = () => {
                avail.missing.forEach(m => store.addToShoppingList(m._id));
                showToast(`Added ${avail.missing.length} ingredients to shopping list`, 'success');
                onRefresh?.();
            };
        }
        root.querySelectorAll('[data-star]').forEach(btn => {
            btn.onclick = () => {
                const stars = Number(btn.dataset.star);
                const note = root.querySelector('#cocktailNoteInput').value;
                store.setRating(c._id, stars, note);
                showToast(`Rated ${stars}/5 stars`, 'success');
                renderBody();
                onRefresh?.();
            };
        });
        root.querySelector('#btnSaveNote').onclick = () => {
            const note = root.querySelector('#cocktailNoteInput').value;
            store.setRating(c._id, ratingObj.rating || 0, note);
            showToast('Tasting note saved', 'success');
            onRefresh?.();
        };
        const colSelect = root.querySelector('#addCollectionSelect');
        if (colSelect) {
            colSelect.onchange = () => {
                if (!colSelect.value) return;
                store.toggleCollectionCocktail(colSelect.value, c._id);
                showToast('Collection updated', 'success');
                renderBody();
            };
        }
        root.querySelector('#btnExportCocktailJson').onclick = () => {
            const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${c._id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };
        root.querySelector('#btnDeleteCocktail').onclick = () => {
            if (confirm(`Delete "${c.name}"?`)) {
                store.deleteCocktail(c._id);
                showToast(`Deleted ${c.name}`, 'danger');
                closeModal();
                onRefresh?.();
            }
        };
    };

    renderBody();
}

export function openCocktailFormModal(existing, onRefresh) {
    const isEdit = Boolean(existing);
    const draft = existing ? structuredClone(existing) : {
        _id: '',
        name: '',
        description: '',
        instructions: '',
        garnish: '',
        glass: 'Cocktail',
        method: 'Shake',
        utensils: [],
        tags: [],
        year: null,
        author: '',
        source: '',
        images: [],
        ingredients: [{ _id: store.ingredients[0]?._id || 'gin', name: store.ingredients[0]?.name || 'Gin', sort: 1, amount: 45, units: 'ml', optional: false, note: '' }]
    };

    const renderForm = () => {
        mountModal(`
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? `Edit ${escapeHtml(draft.name)}` : 'Create New Cocktail'}</h2>
                <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
            </div>
            <div class="modal-body">
                <form id="cocktailForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Cocktail Name *</label>
                            <input type="text" id="cfName" class="form-control" required value="${escapeHtml(draft.name)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Glassware</label>
                            <select id="cfGlass" class="form-control">
                                ${store.glasses.map(g => `<option value="${escapeHtml(g.name)}" ${draft.glass === g.name ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Method</label>
                            <select id="cfMethod" class="form-control">
                                ${store.methods.map(m => `<option value="${escapeHtml(m.name)}" ${draft.method === m.name ? 'selected' : ''}>${escapeHtml(m.name)} (${m.dilution_percentage}% dilution)</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Garnish</label>
                            <input type="text" id="cfGarnish" class="form-control" value="${escapeHtml(draft.garnish || '')}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tags (comma-separated)</label>
                            <input type="text" id="cfTags" class="form-control" value="${escapeHtml((draft.tags || []).join(', '))}" placeholder="Sour, Gin, Classic">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Author / Year</label>
                            <input type="text" id="cfAuthor" class="form-control" value="${escapeHtml(draft.author || draft.year || '')}">
                        </div>
                        <div class="form-group full">
                            <label class="form-label">Description</label>
                            <textarea id="cfDesc" class="form-control">${escapeHtml(draft.description || '')}</textarea>
                        </div>
                        <div class="form-group full">
                            <label class="form-label">Instructions *</label>
                            <textarea id="cfInst" class="form-control" required>${escapeHtml(draft.instructions || '')}</textarea>
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px;">
                        <strong>Ingredients</strong>
                        <button type="button" class="btn btn-secondary btn-sm" id="btnAddIngRow">+ Add Ingredient</button>
                    </div>
                    <div id="cfIngRows">
                        ${draft.ingredients.map((row, idx) => `
                            <div class="data-row" style="margin-bottom:6px;" data-row-idx="${idx}">
                                <select class="form-control cf-ing-id" style="flex:2;">
                                    ${store.ingredients.map(i => `<option value="${escapeHtml(i._id)}" ${row._id === i._id ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join('')}
                                </select>
                                <input type="number" step="any" class="form-control cf-ing-amt" style="width:90px;" value="${row.amount ?? ''}" placeholder="Amt">
                                <input type="text" class="form-control cf-ing-unit" style="width:85px;" value="${escapeHtml(row.units || 'ml')}" placeholder="ml/oz">
                                <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;">
                                    <input type="checkbox" class="cf-ing-opt" ${row.optional ? 'checked' : ''}> Opt
                                </label>
                                <button type="button" class="btn btn-danger btn-xs cf-ing-del">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-close-modal>Cancel</button>
                <button class="btn btn-primary" id="btnSaveCocktail">Save Cocktail</button>
            </div>
        `);

        const root = modalRoot();
        const syncDraftFromDom = () => {
            draft.name = root.querySelector('#cfName').value.trim();
            draft.glass = root.querySelector('#cfGlass').value;
            draft.method = root.querySelector('#cfMethod').value;
            draft.garnish = root.querySelector('#cfGarnish').value.trim();
            draft.tags = root.querySelector('#cfTags').value.split(',').map(s => s.trim()).filter(Boolean);
            draft.author = root.querySelector('#cfAuthor').value.trim() || null;
            draft.description = root.querySelector('#cfDesc').value.trim();
            draft.instructions = root.querySelector('#cfInst').value.trim();
            draft.ingredients = [...root.querySelectorAll('#cfIngRows .data-row')].map((el, i) => {
                const ingId = el.querySelector('.cf-ing-id').value;
                const ingName = store.ingredientMap.get(ingId)?.name || ingId;
                return {
                    _id: ingId,
                    name: ingName,
                    sort: i + 1,
                    amount: Number(el.querySelector('.cf-ing-amt').value) || 0,
                    units: el.querySelector('.cf-ing-unit').value.trim() || 'ml',
                    optional: el.querySelector('.cf-ing-opt').checked,
                    substitutes: []
                };
            });
        };

        root.querySelector('#btnAddIngRow').onclick = () => {
            syncDraftFromDom();
            draft.ingredients.push({
                _id: store.ingredients[0]?._id || 'gin',
                name: store.ingredients[0]?.name || 'Gin',
                sort: draft.ingredients.length + 1,
                amount: 30,
                units: 'ml',
                optional: false,
                substitutes: []
            });
            renderForm();
        };

        root.querySelectorAll('.cf-ing-del').forEach((btn, idx) => {
            btn.onclick = () => {
                syncDraftFromDom();
                draft.ingredients.splice(idx, 1);
                renderForm();
            };
        });

        root.querySelector('#btnSaveCocktail').onclick = () => {
            syncDraftFromDom();
            if (!draft.name || !draft.instructions) {
                showToast('Name and instructions are required', 'danger');
                return;
            }
            if (!isEdit) {
                draft._id = slugify(draft.name) + '-' + Math.floor(Math.random() * 1000);
            }
            draft.abv = store.calculateAbv(draft);
            store.saveCocktail(draft);
            showToast(`Saved "${draft.name}"`, 'success');
            closeModal();
            onRefresh?.();
        };
    };

    renderForm();
}

export function openIngredientDetailModal(ingredientId, onRefresh) {
    const ing = store.ingredientMap.get(ingredientId);
    if (!ing) return;

    const img = getPrimaryImage(ing);
    const inShelf = store.getShelfSet().has(ing._id);
    const usedIn = store.cocktails.filter(c => (c.ingredients || []).some(r => r._id === ing._id));

    mountModal(`
        <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(ing.name)}</h2>
            <div style="display:flex;gap:8px;">
                <button class="btn ${inShelf ? 'btn-success' : 'btn-secondary'} btn-sm" id="btnIngToggleShelf">
                    ${inShelf ? '✓ On My Shelf' : '+ Add to Shelf'}
                </button>
                <button class="btn btn-secondary btn-sm" id="btnIngShop">+ Shopping List</button>
                <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
            </div>
        </div>
        <div class="modal-body">
            <div class="detail-hero" style="grid-template-columns:180px 1fr;">
                <div class="detail-image-box" style="height:180px;">
                    ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(ing.name)}">` : `<div class="cocktail-thumb-placeholder">🍾</div>`}
                </div>
                <div>
                    <div class="detail-meta-grid">
                        <div class="meta-pill-box">
                            <div class="meta-pill-label">Category</div>
                            <div class="meta-pill-val">${escapeHtml(ing.category || 'Uncategorized')}</div>
                        </div>
                        <div class="meta-pill-box">
                            <div class="meta-pill-label">Strength</div>
                            <div class="meta-pill-val">${ing.strength ?? 0}% ABV</div>
                        </div>
                        <div class="meta-pill-box">
                            <div class="meta-pill-label">Origin</div>
                            <div class="meta-pill-val">${escapeHtml(ing.origin || 'Various')}</div>
                        </div>
                        <div class="meta-pill-box">
                            <div class="meta-pill-label">Sugar</div>
                            <div class="meta-pill-val">${ing.sugar_g_per_ml ?? 0} g/ml</div>
                        </div>
                    </div>
                    <p style="color:var(--text-secondary);white-space:pre-line;">${escapeHtml(ing.description || 'No description available.')}</p>
                </div>
            </div>

            <div class="panel">
                <div class="panel-title">Used in ${usedIn.length} Cocktails</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:220px;overflow-y:auto;">
                    ${usedIn.map(c => `<button class="btn btn-secondary btn-xs" data-open-cocktail="${escapeHtml(c._id)}">${escapeHtml(c.name)}</button>`).join('')}
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary btn-sm" data-close-modal>Close</button>
        </div>
    `);

    const root = modalRoot();
    root.querySelector('#btnIngToggleShelf').onclick = () => {
        const added = store.toggleShelfIngredient(ing._id);
        showToast(added ? `Added ${ing.name} to shelf` : `Removed ${ing.name} from shelf`, 'success');
        openIngredientDetailModal(ing._id, onRefresh);
        onRefresh?.();
    };
    root.querySelector('#btnIngShop').onclick = () => {
        store.addToShoppingList(ing._id);
        showToast(`Added ${ing.name} to shopping list`, 'success');
        onRefresh?.();
    };
    root.querySelectorAll('[data-open-cocktail]').forEach(btn => {
        btn.onclick = () => openCocktailDetailModal(btn.dataset.openCocktail, onRefresh);
    });
}

export function openIngredientFormModal(onRefresh) {
    mountModal(`
        <div class="modal-header">
            <h2 class="modal-title">Add Custom Ingredient</h2>
            <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
        </div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Ingredient Name *</label>
                    <input type="text" id="ifName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select id="ifCat" class="form-control">
                        ${store.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Strength (% ABV)</label>
                    <input type="number" id="ifAbv" class="form-control" value="40" min="0" max="100" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">Origin</label>
                    <input type="text" id="ifOrigin" class="form-control" placeholder="e.g. Scotland">
                </div>
                <div class="form-group full">
                    <label class="form-label">Description</label>
                    <textarea id="ifDesc" class="form-control"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-close-modal>Cancel</button>
            <button class="btn btn-primary" id="btnSaveIng">Save Ingredient</button>
        </div>
    `, true);

    modalRoot().querySelector('#btnSaveIng').onclick = () => {
        const name = document.getElementById('ifName').value.trim();
        if (!name) {
            showToast('Ingredient name is required', 'danger');
            return;
        }
        const ing = {
            _id: slugify(name) + '-' + Math.floor(Math.random() * 1000),
            name,
            category: document.getElementById('ifCat').value,
            strength: Number(document.getElementById('ifAbv').value) || 0,
            origin: document.getElementById('ifOrigin').value.trim() || null,
            description: document.getElementById('ifDesc').value.trim() || null,
            images: [],
            units: 'ml'
        };
        store.saveIngredient(ing);
        showToast(`Created ingredient "${name}"`, 'success');
        closeModal();
        onRefresh?.();
    };
}

export function openManageBarsModal(onRefresh) {
    const render = () => {
        mountModal(`
            <div class="modal-header">
                <h2 class="modal-title">Manage Bars</h2>
                <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
            </div>
            <div class="modal-body">
                <div class="data-list" style="margin-bottom:16px;">
                    ${store.user.bars.map(b => `
                        <div class="data-row">
                            <div class="data-row-main">
                                <div class="data-row-title">${escapeHtml(b.name)} ${b.id === store.user.activeBarId ? '<span class="badge badge-success" style="margin-left:6px;">Active</span>' : ''}</div>
                                <div class="data-row-sub">${b.shelf.length} bottles on shelf • ${b.shoppingList.length} on shopping list</div>
                            </div>
                            <div style="display:flex;gap:6px;">
                                ${b.id !== store.user.activeBarId ? `<button class="btn btn-secondary btn-xs" data-use-bar="${escapeHtml(b.id)}">Switch</button>` : ''}
                                ${store.user.bars.length > 1 ? `<button class="btn btn-danger btn-xs" data-del-bar="${escapeHtml(b.id)}">Delete</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="newBarName" class="form-control" placeholder="New bar name (e.g. Tiki Lounge)">
                    <button class="btn btn-primary" id="btnCreateBar">Create</button>
                </div>
            </div>
        `, true);

        const root = modalRoot();
        root.querySelectorAll('[data-use-bar]').forEach(btn => {
            btn.onclick = () => {
                store.switchBar(btn.dataset.useBar);
                render();
                onRefresh?.();
            };
        });
        root.querySelectorAll('[data-del-bar]').forEach(btn => {
            btn.onclick = () => {
                store.deleteBar(btn.dataset.delBar);
                render();
                onRefresh?.();
            };
        });
        root.querySelector('#btnCreateBar').onclick = () => {
            const name = root.querySelector('#newBarName').value.trim();
            if (!name) return;
            store.createBar(name);
            showToast(`Created bar "${name}"`, 'success');
            render();
            onRefresh?.();
        };
    };
    render();
}

export function openBackupModal(onRefresh) {
    mountModal(`
        <div class="modal-header">
            <h2 class="modal-title">Backup &amp; Restore Bar Data</h2>
            <button class="btn btn-ghost btn-sm" data-close-modal>✕</button>
        </div>
        <div class="modal-body">
            <p style="color:var(--text-secondary);margin-bottom:14px;">
                Export your shelf inventory, bars, favorites, ratings, notes, collections, and custom recipes to JSON, or restore from a previous backup.
            </p>
            <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btnExportAll">Download JSON Backup</button>
                <label class="btn btn-secondary" style="cursor:pointer;">
                    Import JSON Backup
                    <input type="file" id="importFileInput" accept=".json" class="hidden">
                </label>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:14px;">
                <button class="btn btn-danger btn-sm" id="btnResetFactory">Reset User Data to Empty Shelf</button>
            </div>
        </div>
    `, true);

    const root = modalRoot();
    root.querySelector('#btnExportAll').onclick = () => {
        const blob = new Blob([store.exportBackup()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bar-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup downloaded', 'success');
    };
    root.querySelector('#importFileInput').onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                store.importBackup(reader.result);
                showToast('Backup restored successfully', 'success');
                closeModal();
                onRefresh?.();
            } catch (err) {
                showToast(err.message, 'danger');
            }
        };
        reader.readAsText(file);
    };
    root.querySelector('#btnResetFactory').onclick = () => {
        if (confirm('Reset all bars, shelf bottles, favorites, and custom recipes?')) {
            store.resetAll();
            showToast('User data reset', 'danger');
            closeModal();
            onRefresh?.();
        }
    };
}
