import { store } from './store.js';
import { escapeHtml, showToast } from './utils.js';

export const EVENT_THEMES = {
    'coasters-classic': {
        name: 'Coasters Classic',
        icon: '🍸',
        defaultTitle: 'Coasters Tavern Cocktail List',
        defaultSubtitle: 'Handcrafted Cocktails • Made to Order',
        bg: '#0f131c',
        bgAccent: '#181e2c',
        text: '#f8fafc',
        muted: '#94a3b8',
        accent: '#f59e0b',
        border: '#f59e0b',
        light: false
    },
    'valentines': {
        name: "Valentine's Day",
        icon: '💘',
        defaultTitle: "Valentine's Cocktail Menu",
        defaultSubtitle: 'Sweet, Bold & Romantic Pours for Two',
        bg: '#1c0a12',
        bgAccent: '#2b101c',
        text: '#fff1f2',
        muted: '#fda4af',
        accent: '#fb7185',
        border: '#f43f5e',
        light: false
    },
    'christmas': {
        name: 'Christmas / Xmas',
        icon: '🎄',
        defaultTitle: 'Coasters Christmas Specials',
        defaultSubtitle: 'Festive Winter Warmers & Holiday Classics',
        bg: '#0a1c14',
        bgAccent: '#132a20',
        text: '#f0fdf4',
        muted: '#a7f3d0',
        accent: '#ef4444',
        border: '#eab308',
        light: false
    },
    'st-patricks': {
        name: "St. Patrick's Day",
        icon: '☘️',
        defaultTitle: "St. Patrick's Day Specials",
        defaultSubtitle: 'Irish Spirits, Emerald Pours & Craic',
        bg: '#061a10',
        bgAccent: '#0d2b1b',
        text: '#ecfdf5',
        muted: '#6ee7b7',
        accent: '#10b981',
        border: '#fbbf24',
        light: false
    },
    'halloween': {
        name: 'Halloween',
        icon: '🎃',
        defaultTitle: 'Haunted Bar Menu',
        defaultSubtitle: 'Spooky Elixirs & Midnight Potions',
        bg: '#120b1e',
        bgAccent: '#1e1233',
        text: '#faf5ff',
        muted: '#c4b5fd',
        accent: '#f97316',
        border: '#a855f7',
        light: false
    },
    'summer-tiki': {
        name: 'Summer / Tiki',
        icon: '🌴',
        defaultTitle: 'Summer Tiki & Sunset Menu',
        defaultSubtitle: 'Tropical Rum, Citrus & Island Vibes',
        bg: '#081c24',
        bgAccent: '#0f2d38',
        text: '#ecfeff',
        muted: '#67e8f9',
        accent: '#fb923c',
        border: '#06b6d4',
        light: false
    },
    'new-years': {
        name: "New Year's Eve",
        icon: '🥂',
        defaultTitle: "New Year's Eve Celebration",
        defaultSubtitle: 'Champagne, Gold & Midnight Classics',
        bg: '#09090b',
        bgAccent: '#18181b',
        text: '#fafafa',
        muted: '#d4d4d8',
        accent: '#fbbf24',
        border: '#eab308',
        light: false
    },
    'clean-light': {
        name: 'Clean Print (Light)',
        icon: '📄',
        defaultTitle: 'Coasters Tavern — Cocktail Menu',
        defaultSubtitle: 'Seasonal Selection',
        bg: '#ffffff',
        bgAccent: '#f8fafc',
        text: '#0f172a',
        muted: '#475569',
        accent: '#b45309',
        border: '#cbd5e1',
        light: true
    }
};

const draft = {
    id: null,
    theme: 'coasters-classic',
    title: EVENT_THEMES['coasters-classic'].defaultTitle,
    subtitle: EVENT_THEMES['coasters-classic'].defaultSubtitle,
    footerNote: 'Coasters Tavern • Please Drink Responsibly',
    format: 'a4', // 'a4' | '1080p'
    columns: 1,   // 1 | 2
    showPrices: true,
    showIngredients: true,
    showAbv: true,
    showQr: true,
    items: [], // [{ cocktailId, price }]
    search: '',
    filterMode: 'all' // 'all' | 'makeable' | 'selected'
};

function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = w;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

export function renderMenuToCanvas(menuConfig) {
    const theme = EVENT_THEMES[menuConfig.theme] || EVENT_THEMES['coasters-classic'];
    const isLandscape = menuConfig.format === '1080p';
    const W = isLandscape ? 1920 : 2480;
    const H = isLandscape ? 1080 : 3508;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg);
    grad.addColorStop(1, theme.bgAccent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Outer & inner decorative borders
    const pad = isLandscape ? 48 : 90;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = isLandscape ? 4 : 8;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    ctx.lineWidth = isLandscape ? 1.5 : 3;
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(pad + 18, pad + 18, W - (pad + 18) * 2, H - (pad + 18) * 2);
    ctx.globalAlpha = 1;

    // Header
    const contentLeft = pad + (isLandscape ? 54 : 90);
    const contentRight = W - contentLeft;
    const contentW = contentRight - contentLeft;

    let y = pad + (isLandscape ? 88 : 170);
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accent;
    ctx.font = `700 ${isLandscape ? 24 : 42}px Inter, Segoe UI, sans-serif`;
    ctx.fillText(`${theme.icon}  ${theme.name.toUpperCase()}  ${theme.icon}`, W / 2, y);

    y += isLandscape ? 56 : 110;
    ctx.fillStyle = theme.text;
    ctx.font = `800 ${isLandscape ? 54 : 104}px Inter, Segoe UI, sans-serif`;
    ctx.fillText(menuConfig.title || theme.defaultTitle, W / 2, y, contentW);

    y += isLandscape ? 36 : 74;
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${isLandscape ? 22 : 42}px Inter, Segoe UI, sans-serif`;
    ctx.fillText(menuConfig.subtitle || '', W / 2, y, contentW);

    // Divider line
    y += isLandscape ? 28 : 60;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = isLandscape ? 2 : 4;
    ctx.beginPath();
    ctx.moveTo(W * 0.25, y);
    ctx.lineTo(W * 0.75, y);
    ctx.stroke();

    y += isLandscape ? 44 : 95;

    // Cocktail Items
    const cols = menuConfig.columns === 2 ? 2 : 1;
    const colGap = isLandscape ? 60 : 90;
    const colW = cols === 2 ? (contentW - colGap) / 2 : contentW;
    const items = (menuConfig.items || [])
        .map(it => ({ ...it, cocktail: store.cocktailMap.get(it.cocktailId) }))
        .filter(it => it.cocktail);

    const footerReserve = isLandscape ? 110 : 220;
    const maxY = H - pad - footerReserve;

    let colIdx = 0;
    let curY = y;
    const startY = y;

    const titleSize = isLandscape ? (cols === 2 ? 24 : 28) : (cols === 2 ? 44 : 52);
    const subSize = isLandscape ? (cols === 2 ? 16 : 18) : (cols === 2 ? 30 : 34);

    for (let i = 0; i < items.length; i++) {
        const { cocktail: c, price } = items[i];
        const x = contentLeft + colIdx * (colW + colGap);

        const abvVal = c.abv ?? store.calculateAbv(c);
        const ingText = (c.ingredients || []).map(ing => ing.name).join(' • ');
        const metaParts = [];
        if (menuConfig.showIngredients && ingText) metaParts.push(ingText);
        if (menuConfig.showAbv && abvVal) metaParts.push(`${abvVal}% ABV`);
        const metaLine = metaParts.join('  |  ');

        ctx.font = `400 ${subSize}px Inter, Segoe UI, sans-serif`;
        const wrappedMeta = metaLine ? wrapCanvasText(ctx, metaLine, colW - 40).slice(0, 2) : [];
        const itemHeight = titleSize + (wrappedMeta.length * (subSize + 8)) + (isLandscape ? 26 : 48);

        if (curY + itemHeight > maxY) {
            if (cols === 2 && colIdx === 0) {
                colIdx = 1;
                curY = startY;
            } else {
                break;
            }
        }

        const drawX = contentLeft + colIdx * (colW + colGap);

        // Title & Price
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.font = `700 ${titleSize}px Inter, Segoe UI, sans-serif`;
        const priceStr = menuConfig.showPrices && price ? `$${Number(price).toFixed(2)}` : '';
        const priceW = priceStr ? ctx.measureText(priceStr).width + 20 : 0;
        ctx.fillText(c.name, drawX, curY, colW - priceW);

        if (priceStr) {
            ctx.textAlign = 'right';
            ctx.fillStyle = theme.accent;
            ctx.font = `700 ${titleSize}px JetBrains Mono, monospace`;
            ctx.fillText(priceStr, drawX + colW, curY);
        }

        // Ingredients / ABV
        let lineY = curY + (isLandscape ? 24 : 44);
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.muted;
        ctx.font = `400 ${subSize}px Inter, Segoe UI, sans-serif`;
        for (const ln of wrappedMeta) {
            ctx.fillText(ln, drawX, lineY, colW);
            lineY += subSize + (isLandscape ? 6 : 12);
        }

        // Subtle separator
        ctx.strokeStyle = theme.border;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX, lineY + (isLandscape ? 4 : 10));
        ctx.lineTo(drawX + colW, lineY + (isLandscape ? 4 : 10));
        ctx.stroke();
        ctx.globalAlpha = 1;

        curY = lineY + (isLandscape ? 26 : 48);
    }

    // Footer & Optional QR
    const footerY = H - pad - (isLandscape ? 34 : 70);
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.muted;
    ctx.font = `500 ${isLandscape ? 18 : 32}px Inter, Segoe UI, sans-serif`;
    ctx.fillText(menuConfig.footerNote || 'Coasters Tavern', contentLeft, footerY);

    if (menuConfig.showQr && typeof window.qrcode === 'function') {
        const qr = window.qrcode(0, 'M');
        qr.addData('https://mrmegatronix.github.io/_ct-BARASS/#cocktails');
        qr.make();
        const count = qr.getModuleCount();
        const qrSize = isLandscape ? 88 : 170;
        const cell = qrSize / count;
        const qrX = contentRight - qrSize;
        const qrY = H - pad - qrSize - (isLandscape ? 16 : 36);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
        ctx.fillStyle = '#000000';
        for (let r = 0; r < count; r++) {
            for (let col = 0; col < count; col++) {
                if (qr.isDark(r, col)) {
                    ctx.fillRect(qrX + col * cell, qrY + r * cell, Math.ceil(cell), Math.ceil(cell));
                }
            }
        }
    }

    return canvas;
}

export function downloadHighResMenuPng(menuConfig) {
    const canvas = renderMenuToCanvas(menuConfig);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    const safeName = (menuConfig.title || 'cocktail-menu').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = dataUrl;
    a.download = `${safeName}-${menuConfig.format === '1080p' ? '1920x1080' : 'A4-300dpi'}.png`;
    a.click();
    showToast(`Downloaded high-res ${menuConfig.format === '1080p' ? '1920×1080' : '2480×3508 (300 DPI)'} PNG`, 'success');
}

export function renderListMakerView(container) {
    const shelfSet = store.getShelfSet();
    const theme = EVENT_THEMES[draft.theme] || EVENT_THEMES['coasters-classic'];
    const selectedIds = new Set(draft.items.map(i => i.cocktailId));
    const q = draft.search.trim().toLowerCase();

    const filteredCocktails = store.cocktails.filter(c => {
        if (draft.filterMode === 'selected' && !selectedIds.has(c._id)) return false;
        if (draft.filterMode === 'makeable' && !store.checkCocktailAvailability(c, shelfSet).canMake) return false;
        if (q && !`${c.name} ${(c.tags || []).join(' ')} ${(c.ingredients || []).map(i => i.name).join(' ')}`.toLowerCase().includes(q)) return false;
        return true;
    }).slice(0, 120);

    const gallery = store.user.printGallery || [];

    container.innerHTML = `
        <div class="page-header no-print">
            <div>
                <h1 class="page-title">Cocktail List &amp; Print Maker</h1>
                <p class="page-subtitle">Create high-res themed event menus (Valentine's, Xmas, St. Patrick's, etc.) and save to your gallery</p>
            </div>
            <div class="page-actions">
                <button class="btn btn-secondary" id="lmSaveGallery">💾 Save to Gallery</button>
                <button class="btn btn-secondary" id="lmDownloadPng">⬇ High-Res PNG</button>
                <button class="btn btn-primary" id="lmPrint">🖨 Print / PDF</button>
            </div>
        </div>

        <div class="lm-layout">
            <!-- Left Controls -->
            <div class="panel no-print" style="display:flex;flex-direction:column;gap:14px;">
                <div>
                    <div class="panel-title">1. Event Theme &amp; Layout</div>
                    <div class="form-group">
                        <label class="form-label">Themed Preset</label>
                        <select id="lmTheme" class="form-control">
                            ${Object.entries(EVENT_THEMES).map(([k, t]) => `<option value="${k}" ${draft.theme === k ? 'selected' : ''}>${t.icon} ${escapeHtml(t.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Menu Title</label>
                        <input type="text" id="lmTitle" class="form-control" value="${escapeHtml(draft.title)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subtitle</label>
                        <input type="text" id="lmSubtitle" class="form-control" value="${escapeHtml(draft.subtitle)}">
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Print Format</label>
                            <select id="lmFormat" class="form-control">
                                <option value="a4" ${draft.format === 'a4' ? 'selected' : ''}>A4 Poster (2480×3508)</option>
                                <option value="1080p" ${draft.format === '1080p' ? 'selected' : ''}>1080p Signage (1920×1080)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Columns</label>
                            <select id="lmCols" class="form-control">
                                <option value="1" ${draft.columns === 1 ? 'selected' : ''}>1 Column</option>
                                <option value="2" ${draft.columns === 2 ? 'selected' : ''}>2 Columns</option>
                            </select>
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;">
                        <label><input type="checkbox" id="lmOptPrice" ${draft.showPrices ? 'checked' : ''}> Prices</label>
                        <label><input type="checkbox" id="lmOptIng" ${draft.showIngredients ? 'checked' : ''}> Ingredients</label>
                        <label><input type="checkbox" id="lmOptAbv" ${draft.showAbv ? 'checked' : ''}> ABV%</label>
                        <label><input type="checkbox" id="lmOptQr" ${draft.showQr ? 'checked' : ''}> QR Code</label>
                    </div>
                </div>

                <div style="border-top:1px solid var(--border);padding-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div class="panel-title" style="margin:0;">2. Select Cocktails (${draft.items.length})</div>
                        ${draft.items.length ? `<button class="btn btn-ghost btn-xs" id="lmClearItems">Clear</button>` : ''}
                    </div>
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <button class="filter-chip ${draft.filterMode === 'all' ? 'active' : ''}" data-lm-filter="all">All</button>
                        <button class="filter-chip success ${draft.filterMode === 'makeable' ? 'active' : ''}" data-lm-filter="makeable">Can Make</button>
                        <button class="filter-chip ${draft.filterMode === 'selected' ? 'active' : ''}" data-lm-filter="selected">Selected (${draft.items.length})</button>
                    </div>
                    <input type="search" id="lmSearch" class="form-control" placeholder="Search cocktails to add..." value="${escapeHtml(draft.search)}" style="margin-bottom:8px;">
                    <div class="data-list" style="max-height:320px;overflow-y:auto;">
                        ${filteredCocktails.map(c => {
                            const selItem = draft.items.find(i => i.cocktailId === c._id);
                            return `
                                <div class="data-row" style="padding:7px 10px;">
                                    <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer;">
                                        <input type="checkbox" class="lm-pick" data-cid="${escapeHtml(c._id)}" ${selItem ? 'checked' : ''}>
                                        <span class="data-row-title" style="font-size:13px;">${escapeHtml(c.name)}</span>
                                    </label>
                                    ${selItem ? `<input type="number" step="0.5" class="form-control lm-price" data-cid="${escapeHtml(c._id)}" value="${selItem.price}" style="width:74px;padding:4px 6px;font-size:12px;" title="Price">` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <!-- Right Live Preview -->
            <div class="panel" style="display:flex;flex-direction:column;gap:14px;">
                <div class="section-header no-print" style="margin:0;">
                    <h2 class="panel-title" style="margin:0;">Live High-Res Preview (${draft.format === '1080p' ? '1920×1080' : '2480×3508 A4'})</h2>
                    <span class="badge badge-accent">${theme.icon} ${escapeHtml(theme.name)}</span>
                </div>

                <div class="lm-preview-stage" id="lmPrintableSheet" style="background:${theme.bg};color:${theme.text};border-color:${theme.border};">
                    <div class="lm-preview-inner" style="border-color:${theme.border};">
                        <div style="text-align:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${theme.accent};">
                            <div style="color:${theme.accent};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">${theme.icon} ${escapeHtml(theme.name)} ${theme.icon}</div>
                            <h2 style="font-size:28px;font-weight:800;margin-bottom:4px;">${escapeHtml(draft.title)}</h2>
                            <p style="color:${theme.muted};font-size:13px;">${escapeHtml(draft.subtitle)}</p>
                        </div>

                        ${draft.items.length === 0 ? `
                            <p style="text-align:center;color:${theme.muted};padding:40px 10px;">Select cocktails from the left panel to build your printable menu.</p>
                        ` : `
                            <div class="lm-preview-items" style="grid-template-columns:repeat(${draft.columns}, minmax(0, 1fr));">
                                ${draft.items.map(it => {
                                    const c = store.cocktailMap.get(it.cocktailId);
                                    if (!c) return '';
                                    const abv = c.abv ?? store.calculateAbv(c);
                                    const ingStr = (c.ingredients || []).map(i => i.name).join(' • ');
                                    return `
                                        <div class="lm-preview-item" style="border-bottom:1px dashed ${theme.border}44;">
                                            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
                                                <strong style="font-size:15px;">${escapeHtml(c.name)}</strong>
                                                ${draft.showPrices ? `<span style="color:${theme.accent};font-family:var(--font-mono);font-weight:700;">$${Number(it.price).toFixed(2)}</span>` : ''}
                                            </div>
                                            <div style="font-size:12px;color:${theme.muted};margin-top:2px;">
                                                ${draft.showIngredients ? escapeHtml(ingStr) : ''}
                                                ${draft.showAbv && abv ? `${draft.showIngredients ? ' • ' : ''}${abv}% ABV` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Saved Gallery -->
        <div class="section-block no-print" style="margin-top:24px;">
            <div class="section-header">
                <h2 class="section-title">Saved Print Gallery (${gallery.length})</h2>
            </div>
            ${gallery.length === 0 ? `
                <div class="panel"><p style="color:var(--text-secondary);">No saved menus yet. Build a themed cocktail list above and click <strong>Save to Gallery</strong>.</p></div>
            ` : `
                <div class="card-grid">
                    ${gallery.map(item => {
                        const t = EVENT_THEMES[item.theme] || EVENT_THEMES['coasters-classic'];
                        return `
                            <div class="panel" style="border-top:4px solid ${t.accent};display:flex;flex-direction:column;gap:8px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                                    <span class="badge badge-accent">${t.icon} ${escapeHtml(t.name)}</span>
                                    <span style="font-size:11px;color:var(--text-muted);">${new Date(item.savedAt).toLocaleDateString()}</span>
                                </div>
                                <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
                                <div style="font-size:12px;color:var(--text-secondary);">${item.items.length} cocktails • ${item.format === '1080p' ? '1080p' : 'A4'}</div>
                                <div style="display:flex;gap:6px;margin-top:auto;padding-top:6px;">
                                    <button class="btn btn-secondary btn-xs" data-gal-load="${escapeHtml(item.id)}">Load</button>
                                    <button class="btn btn-primary btn-xs" data-gal-png="${escapeHtml(item.id)}">PNG</button>
                                    <button class="btn btn-danger btn-xs" data-gal-del="${escapeHtml(item.id)}" style="margin-left:auto;">✕</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    // Wire events
    container.querySelector('#lmTheme').onchange = (e) => {
        const prevTheme = EVENT_THEMES[draft.theme];
        draft.theme = e.target.value;
        const nextTheme = EVENT_THEMES[draft.theme];
        if (!draft.title || draft.title === prevTheme?.defaultTitle) draft.title = nextTheme.defaultTitle;
        if (!draft.subtitle || draft.subtitle === prevTheme?.defaultSubtitle) draft.subtitle = nextTheme.defaultSubtitle;
        renderListMakerView(container);
    };
    container.querySelector('#lmTitle').oninput = (e) => { draft.title = e.target.value; };
    container.querySelector('#lmSubtitle').oninput = (e) => { draft.subtitle = e.target.value; };
    container.querySelector('#lmFormat').onchange = (e) => { draft.format = e.target.value; renderListMakerView(container); };
    container.querySelector('#lmCols').onchange = (e) => { draft.columns = Number(e.target.value); renderListMakerView(container); };
    container.querySelector('#lmOptPrice').onchange = (e) => { draft.showPrices = e.target.checked; renderListMakerView(container); };
    container.querySelector('#lmOptIng').onchange = (e) => { draft.showIngredients = e.target.checked; renderListMakerView(container); };
    container.querySelector('#lmOptAbv').onchange = (e) => { draft.showAbv = e.target.checked; renderListMakerView(container); };
    container.querySelector('#lmOptQr').onchange = (e) => { draft.showQr = e.target.checked; renderListMakerView(container); };
    container.querySelector('#lmSearch').oninput = (e) => { draft.search = e.target.value; renderListMakerView(container); };

    container.querySelectorAll('[data-lm-filter]').forEach(btn => {
        btn.onclick = () => { draft.filterMode = btn.dataset.lmFilter; renderListMakerView(container); };
    });

    const clearBtn = container.querySelector('#lmClearItems');
    if (clearBtn) clearBtn.onclick = () => { draft.items = []; renderListMakerView(container); };

    container.querySelectorAll('.lm-pick').forEach(chk => {
        chk.onchange = () => {
            const cid = chk.dataset.cid;
            if (chk.checked) {
                if (!draft.items.some(i => i.cocktailId === cid)) {
                    draft.items.push({ cocktailId: cid, price: 18 });
                }
            } else {
                draft.items = draft.items.filter(i => i.cocktailId !== cid);
            }
            renderListMakerView(container);
        };
    });

    container.querySelectorAll('.lm-price').forEach(inp => {
        inp.onchange = () => {
            const item = draft.items.find(i => i.cocktailId === inp.dataset.cid);
            if (item) item.price = Number(inp.value) || 0;
            renderListMakerView(container);
        };
    });

    container.querySelector('#lmDownloadPng').onclick = () => {
        if (draft.items.length === 0) {
            showToast('Select at least one cocktail first', 'danger');
            return;
        }
        downloadHighResMenuPng(draft);
    };

    container.querySelector('#lmPrint').onclick = () => window.print();

    container.querySelector('#lmSaveGallery').onclick = () => {
        if (draft.items.length === 0) {
            showToast('Select at least one cocktail to save', 'danger');
            return;
        }
        store.saveMenuToGallery({
            id: 'menu-' + Date.now(),
            theme: draft.theme,
            title: draft.title,
            subtitle: draft.subtitle,
            footerNote: draft.footerNote,
            format: draft.format,
            columns: draft.columns,
            showPrices: draft.showPrices,
            showIngredients: draft.showIngredients,
            showAbv: draft.showAbv,
            showQr: draft.showQr,
            items: structuredClone(draft.items),
            savedAt: new Date().toISOString()
        });
        showToast('Saved menu to Print Gallery!', 'success');
        renderListMakerView(container);
    };

    container.querySelectorAll('[data-gal-load]').forEach(btn => {
        btn.onclick = () => {
            const found = (store.user.printGallery || []).find(g => g.id === btn.dataset.galLoad);
            if (!found) return;
            Object.assign(draft, structuredClone(found));
            showToast(`Loaded "${found.title}"`, 'success');
            renderListMakerView(container);
        };
    });
    container.querySelectorAll('[data-gal-png]').forEach(btn => {
        btn.onclick = () => {
            const found = (store.user.printGallery || []).find(g => g.id === btn.dataset.galPng);
            if (found) downloadHighResMenuPng(found);
        };
    });
    container.querySelectorAll('[data-gal-del]').forEach(btn => {
        btn.onclick = () => {
            store.deleteMenuFromGallery(btn.dataset.galDel);
            showToast('Removed from gallery', 'danger');
            renderListMakerView(container);
        };
    });
}
