/* ==========================================================================
   REVIEWS SECTION — fetch, render, interactive star input, submission
   Calls a Cloudflare Worker (see /worker/reviews-worker.js) backed by KV
   storage, so reviews are genuinely shared across visitors, not just saved
   locally in one browser. Update REVIEWS_ENDPOINT below to your deployed
   Worker URL before going live.
   ========================================================================== */

(function () {
  const REVIEWS_ENDPOINT = 'https://reviews.cintexa.workers.dev/reviews'; // <-- replace with your deployed Worker URL

  const grid = document.getElementById('reviews-grid');
  const avgEl = document.getElementById('reviews-avg');
  const avgStarsEl = document.getElementById('reviews-avg-stars');
  const countEl = document.getElementById('reviews-count');
  const barsEl = document.getElementById('reviews-bars');
  const loadMoreBtn = document.getElementById('reviews-load-more');
  const form = document.getElementById('review-form');
  const statusEl = document.getElementById('review-form-status');
  const starInput = document.getElementById('review-star-input');
  const ratingValueInput = document.getElementById('review-rating-value');

  if (!grid) return; // reviews section isn't on this page

  const PAGE_SIZE = 6;
  let allReviews = [];
  let shownCount = 0;

  // ---- Star rendering helpers ----
  const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z';

  function starsSvgRow(rating, size = 18) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const cls = i <= Math.round(rating) ? 'star-fill' : 'star-empty';
      html += `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" width="${size}" height="${size}"><path d="${STAR_PATH}"/></svg>`;
    }
    return html;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  // ---- Render summary (average score, star row, distribution bars) ----
  function renderSummary(stats) {
    avgEl.textContent = stats.count ? stats.average.toFixed(1) : '—';
    avgStarsEl.innerHTML = starsSvgRow(stats.average, 20);
    countEl.textContent = stats.count
      ? `Based on ${stats.count} review${stats.count === 1 ? '' : 's'}`
      : 'No reviews yet — be the first';

    barsEl.innerHTML = '';
    for (let star = 5; star >= 1; star--) {
      const n = stats.distribution[star] || 0;
      const pct = stats.count ? Math.round((n / stats.count) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'reviews-bar-row';
      row.innerHTML = `
        <span>${star} star</span>
        <span class="reviews-bar-track"><span class="reviews-bar-fill" data-pct="${pct}"></span></span>
        <span>${n}</span>`;
      barsEl.appendChild(row);
    }
    // animate bar widths in on next frame so the transition actually plays
    requestAnimationFrame(() => {
      barsEl.querySelectorAll('.reviews-bar-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });
  }

  // ---- Render review cards (paginated client-side) ----
  function renderCards() {
    grid.innerHTML = '';
    const toShow = allReviews.slice(0, shownCount);

    if (toShow.length === 0) {
      grid.innerHTML = '<div class="reviews-empty glass">No reviews yet. If you\'ve worked with Cintexa, be the first to share your experience below.</div>';
      loadMoreBtn.style.display = 'none';
      return;
    }

    toShow.forEach((r, i) => {
      const card = document.createElement('article');
      card.className = 'review-card glass';
      card.style.animationDelay = `${Math.min(i, 8) * 70}ms`;
      card.innerHTML = `
        <div class="review-card-head">
          <span class="review-avatar">${escapeHtml(initials(r.name))}</span>
          <div>
            <div class="review-name">${escapeHtml(r.name)}${r.company ? ` <span style="color:var(--text-muted); font-weight:400;">· ${escapeHtml(r.company)}</span>` : ''}</div>
            <div class="review-date">${formatDate(r.createdAt)}</div>
          </div>
        </div>
        <span class="star-row">${starsSvgRow(r.rating)}</span>
        <p class="review-text">${escapeHtml(r.text)}</p>
        <span class="review-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Client review</span>
      `;
      grid.appendChild(card);
    });

    loadMoreBtn.style.display = shownCount < allReviews.length ? 'inline-flex' : 'none';
  }

  // ---- Merge AggregateRating + Review data into the page's existing Organization schema ----
  // Rather than injecting a second, competing Organization block, this updates the one
  // static schema block already in <head> (see id="org-schema" in index.html) so search
  // engines see exactly one canonical Organization entity for Cintexa.
  function injectSchema(stats, reviews) {
    const orgScript = document.getElementById('org-schema');
    if (!orgScript || !stats.count) return;

    let schema;
    try {
      schema = JSON.parse(orgScript.textContent);
    } catch {
      return;
    }

    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: stats.average,
      reviewCount: stats.count,
      bestRating: 5,
      worstRating: 1,
    };
    schema.review = reviews.slice(0, 10).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      datePublished: r.createdAt.slice(0, 10),
      reviewBody: r.text,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));

    orgScript.textContent = JSON.stringify(schema, null, 2);
  }

  // ---- Load reviews from the Worker ----
  async function loadReviews() {
    try {
      const res = await fetch(REVIEWS_ENDPOINT);
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();

      allReviews = data.reviews || [];
      shownCount = Math.min(PAGE_SIZE, allReviews.length);

      renderSummary(data.stats || { count: 0, average: 0, distribution: {} });
      renderCards();
      injectSchema(data.stats || { count: 0, average: 0 }, allReviews);
    } catch (err) {
      console.error('Reviews load error:', err);
      countEl.textContent = "Reviews aren't connected yet.";
      avgEl.textContent = '—';
      avgStarsEl.innerHTML = starsSvgRow(0, 20);
      barsEl.innerHTML = '';
      grid.innerHTML = '<div class="reviews-empty glass">Be the first to leave a review once this section is connected — your feedback will show up here for other visitors.</div>';
      loadMoreBtn.style.display = 'none';
    }
  }

  loadMoreBtn?.addEventListener('click', () => {
    shownCount = Math.min(shownCount + PAGE_SIZE, allReviews.length);
    renderCards();
  });

  // ---- Interactive star input ----
  if (starInput) {
    const buttons = Array.from(starInput.querySelectorAll('button'));

    function setActive(value) {
      buttons.forEach(b => b.classList.toggle('is-active', Number(b.dataset.value) <= value));
    }

    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const v = Number(btn.dataset.value);
        buttons.forEach(b => b.classList.toggle('is-hover', Number(b.dataset.value) <= v));
      });
      btn.addEventListener('mouseleave', () => {
        buttons.forEach(b => b.classList.remove('is-hover'));
      });
      btn.addEventListener('click', () => {
        const v = Number(btn.dataset.value);
        ratingValueInput.value = v;
        setActive(v);
        buttons.forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.value) === v)));
      });
    });
  }

  // ---- Submit a new review ----
  function showStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = `review-form-status is-visible is-${type}`;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('review-name').value.trim();
      const company = document.getElementById('review-company').value.trim();
      const text = document.getElementById('review-text').value.trim();
      const rating = Number(ratingValueInput.value);
      const submitBtn = document.getElementById('review-submit-btn');

      if (!name || !text) {
        showStatus('Please add your name and a short review.', 'error');
        return;
      }
      if (!rating) {
        showStatus('Please select a star rating.', 'error');
        return;
      }

      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const res = await fetch(REVIEWS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, company, text, rating }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.error || 'Something went wrong.');

        if (data.pendingModeration) {
          showStatus(`Thanks, ${name.split(' ')[0]} — your review has been submitted and will appear once it's been reviewed.`, 'success');
        } else {
          showStatus(`Thanks, ${name.split(' ')[0]} — your review is now live!`, 'success');
          loadReviews();
        }
        form.reset();
        starInput?.querySelectorAll('button').forEach(b => b.classList.remove('is-active', 'is-hover'));
        ratingValueInput.value = '0';
      } catch (err) {
        console.error('Review submit error:', err);
        showStatus("We couldn't submit your review right now. Please try again shortly.", 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  loadReviews();
})();
