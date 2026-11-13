export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || ('item-' + Date.now());
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

export function getPrimaryImage(item) {
    if (item && Array.isArray(item.images) && item.images.length > 0) {
        const sorted = [...item.images].sort((a, b) => (a.sort || 0) - (b.sort || 0));
        return sorted[0].uri;
    }
    return null;
}

export function renderCocktailCardHtml(c, store) {
    const avail = store.checkCocktailAvailability(c);
    const img = getPrimaryImage(c);
    const isFav = store.user.favorites.includes(c._id);
    const abv = c.abv !== null && c.abv !== undefined ? c.abv : store.calculateAbv(c);
    const ratingObj = store.user.ratings[c._id];
    const ingNames = (c.ingredients || []).map(i => i.name).join(', ');

    let statusBadge = '';
    if (avail.canMake) {
        statusBadge = `<span class="badge badge-success">Can Make</span>`;
    } else if (avail.almostMakeable) {
        statusBadge = `<span class="badge badge-warn">Missing 1</span>`;
    } else if (avail.missingCount > 0) {
        statusBadge = `<span class="badge badge-dark">-${avail.missingCount} ing</span>`;
    }

    const favBadge = isFav ? `<span class="badge badge-warn">★ Fav</span>` : '';

    return `
        <article class="cocktail-card" data-cocktail-id="${escapeHtml(c._id)}">
            <div class="cocktail-thumb-wrap">
                ${img
                    ? `<img class="cocktail-thumb" src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}" loading="lazy">`
                    : `<div class="cocktail-thumb-placeholder">🍸</div>`
                }
                <div class="card-badges-top">
                    ${statusBadge}
                    ${favBadge}
                </div>
            </div>
            <div class="cocktail-card-body">
                <div class="cocktail-card-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
                <div class="cocktail-card-meta">
                    <span>${escapeHtml(c.glass || 'Any Glass')} • ${escapeHtml(c.method || 'Build')}</span>
                    <span>${abv ? `${abv}% ABV` : '0% ABV'}${ratingObj?.rating ? ` • ★${ratingObj.rating}` : ''}</span>
                </div>
                <div class="cocktail-card-ings" title="${escapeHtml(ingNames)}">${escapeHtml(ingNames || 'No ingredients listed')}</div>
                <div class="cocktail-card-tags">
                    ${(c.tags || []).slice(0, 3).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
                </div>
            </div>
        </article>
    `;
}
