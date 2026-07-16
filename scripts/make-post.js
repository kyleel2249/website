#!/usr/bin/env node
/**
 * Generates /blog/post-<slug>.html from a JSON spec file.
 * Usage: node scripts/make-post.js blog/content/<slug>.json
 *
 * Spec shape:
 * {
 *   "slug": "...", "title": "...", "dek": "...", "category": "Web Development",
 *   "date": "2026-06-01", "readMinutes": 8,
 *   "keywords": ["keyword one", "keyword two", ...],   // optional, for meta keywords
 *   "bodyHtml": "<p>...</p><h2>...</h2>...",
 *   "faqs": [{ "q": "Question?", "a": "Plain-text answer." }, ...],  // optional FAQ section
 *   "sources": [{ "text": "Description of source", "url": "https://..." }]
 * }
 */
const fs = require('fs');
const path = require('path');

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node scripts/make-post.js <path-to-spec.json>');
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const SITE_URL = 'https://www.cintexa.com';
const ROOT = path.resolve(__dirname, '..');

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const sourcesHtml = spec.sources.map(s =>
  `      <li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(s.text)}</a></li>`
).join('\n');

const faqs = Array.isArray(spec.faqs) ? spec.faqs : [];

const faqHtml = faqs.length === 0 ? '' : `
      <div class="post-faq">
        <h2>Frequently asked questions</h2>
        <div class="faq-list">
${faqs.map((f, i) => `          <div class="faq-item">
            <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${i}">
              <span>${esc(f.q)}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="faq-chevron"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="faq-answer" id="faq-answer-${i}">
              <p>${esc(f.a)}</p>
            </div>
          </div>`).join('\n')}
        </div>
      </div>`;

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: spec.title,
  description: spec.dek,
  datePublished: spec.date,
  author: { '@type': 'Organization', name: 'Cintexa' },
  publisher: { '@type': 'Organization', name: 'Cintexa' },
  mainEntityOfPage: `${SITE_URL}/blog/post-${spec.slug}.html`,
};

const faqSchema = faqs.length === 0 ? null : {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const keywordsMeta = Array.isArray(spec.keywords) && spec.keywords.length
  ? `\n<meta name="keywords" content="${esc(spec.keywords.join(', '))}">`
  : '';

const html = `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<script>document.documentElement.className = 'js';</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(spec.title)} | Cintexa Blog</title>
<meta name="description" content="${esc(spec.dek)}">${keywordsMeta}
<link rel="canonical" href="${SITE_URL}/blog/post-${spec.slug}.html">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(spec.title)}">
<meta property="og:description" content="${esc(spec.dek)}">
<meta property="og:url" content="${SITE_URL}/blog/post-${spec.slug}.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(spec.title)}">
<meta name="twitter:description" content="${esc(spec.dek)}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#070D1A">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="../css/header.css">
<link rel="stylesheet" href="../css/sections.css">
<link rel="stylesheet" href="../css/blog.css">
<link rel="stylesheet" href="../css/support-widget.css">

<script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
</script>${faqSchema ? `
<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>` : ''}
</head>
<body>

<a href="#main" class="skip-link">Skip to content</a>

<header class="site-header is-scrolled" id="site-header">
  <div class="container nav-row">
    <a href="../" class="brand" aria-label="Cintexa home">
      <svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="5" fill="#19D3FF"/><circle cx="6" cy="8" r="3" fill="#1E6BFF"/><circle cx="26" cy="8" r="3" fill="#7C4DFF"/><circle cx="6" cy="24" r="3" fill="#7C4DFF"/><circle cx="26" cy="24" r="3" fill="#1E6BFF"/></svg>
      Cintexa
    </a>
    <nav class="nav-links" id="nav-links" aria-label="Primary">
      <a href="../#services">Services</a>
      <a href="../#ecosystem">Platform</a>
      <a href="../#developer-portal">Developers</a>
      <a href="../#case-studies">Case Studies</a>
      <a href="./" aria-current="page">Blog</a>
      <a href="../#pricing">Pricing</a>
      <a href="../#contact">Contact</a>
    </nav>
    <div class="nav-actions">
      <a href="../#diagnostics" class="btn btn-primary btn-sm">Free Diagnostics</a>
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>
</header>

<main id="main">
  <article class="section" style="padding-top: calc(var(--space-10) + 2rem);">
    <div class="container">
      <header class="post-header">
        <span class="blog-card-cat">${esc(spec.category)}</span>
        <h1>${esc(spec.title)}</h1>
        <p class="post-dek">${esc(spec.dek)}</p>
        <div class="post-byline">
          <span class="avatar-dot" aria-hidden="true"></span>
          <span>Cintexa Team · ${spec.date} · ${spec.readMinutes} min read</span>
        </div>
      </header>

      <div class="post-body">
${spec.bodyHtml}
${faqHtml}
      </div>

      <div class="post-sources">
        <h2 class="post-sources-heading">Sources</h2>
        <ol>
${sourcesHtml}
        </ol>
      </div>

      <div class="post-cta glass">
        <h3 style="margin-bottom:var(--space-3); font-size:var(--fs-display-sm);">Want this implemented, not just explained?</h3>
        <p style="color:var(--text-secondary); margin-bottom:var(--space-5);">Cintexa builds exactly the kind of systems this article covers.</p>
        <a href="../#contact" class="btn btn-primary">Start a conversation</a>
      </div>
    </div>
  </article>
</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-bottom">
      <span>© 2026 Cintexa. All rights reserved.</span>
      <a href="./" style="color:var(--cyan); font-size:var(--fs-body-sm);">← Back to blog</a>
    </div>
  </div>
</footer>

<button class="cs-launcher" id="support-launcher" aria-label="Open chat with Cintexa Support" aria-expanded="false" aria-controls="support-panel">
  <span class="cs-badge" aria-hidden="true"></span>
  <img src="../assets/logo/cintexa-logo-widget.png" alt="" width="34" height="34">
</button>

<section class="cs-panel" id="support-panel" aria-label="Chat with Cintexa Support" role="dialog" aria-modal="false">
  <div class="cs-header">
    <div class="cs-avatar">
      <img src="../assets/logo/cintexa-logo-widget.png" alt="" width="24" height="24">
      <span class="status-dot" aria-hidden="true"></span>
    </div>
    <div class="cs-header-text">
      <h3>Cintexa Support</h3>
      <p>Usually replies in seconds</p>
    </div>
    <button class="cs-close" id="support-close" aria-label="Close chat">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>

  <div class="cs-messages" id="support-messages" aria-live="polite"></div>
  <div class="cs-suggestions" id="support-suggestions"></div>

  <form class="cs-input-row" id="support-form">
    <textarea id="support-input" rows="1" placeholder="Ask Cintexa Support anything..." aria-label="Message to Cintexa Support"></textarea>
    <button type="submit" class="cs-send" id="support-send" aria-label="Send message">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
    </button>
  </form>
  <p class="cs-footer-note">Cintexa Support is an automated assistant. Responses may be reviewed for quality.</p>
</section>

<script src="../js/main.js"></script>
<script src="../js/faq-accordion.js"></script>
<script src="../js/support-widget.js"></script>
</body>
</html>
`;

const outPath = path.join(ROOT, 'blog', `post-${spec.slug}.html`);
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✓ Wrote ${outPath}`);
