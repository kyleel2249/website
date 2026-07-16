#!/usr/bin/env node
/**
 * Cintexa Blog Build Script
 * -------------------------------------------------------------
 * Reads /blog/posts.json (single source of truth) and regenerates:
 *   - /sitemap.xml          (all pages + every blog post)
 *   - /blog/feed.xml        (RSS 2.0 feed)
 *   - /blog/index.html      (blog card grid, injected between markers)
 *
 * Run this any time a post is added, edited, or removed:
 *   node scripts/build-blog.js
 *
 * Each post in posts.json must have:
 *   { slug, title, dek, category, date (YYYY-MM-DD), readMinutes, file }
 * `file` points to the post's HTML fragment in /blog/content/<file>.html
 * which gets inlined into /blog/post-<slug>.html by this script.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'blog', 'posts.json');
const BLOG_INDEX = path.join(ROOT, 'blog', 'index.html');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const FEED = path.join(ROOT, 'blog', 'feed.xml');
const SITE_URL = 'https://www.cintexa.com';

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/blog/', priority: '0.8', changefreq: 'weekly' },
  { url: '/privacy.html', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms.html', priority: '0.3', changefreq: 'yearly' },
];

function loadPosts() {
  if (!fs.existsSync(POSTS_JSON)) return [];
  const raw = fs.readFileSync(POSTS_JSON, 'utf8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemap(posts) {
  const urls = [...STATIC_PAGES];
  posts.forEach(p => {
    urls.push({ url: `/blog/post-${p.slug}.html`, priority: '0.7', changefreq: 'monthly', lastmod: p.date });
  });

  const body = urls.map(u => {
    const lastmodLine = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
    return `  <url>
    <loc>${SITE_URL}${u.url}</loc>${lastmodLine}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  fs.writeFileSync(SITEMAP, xml, 'utf8');
  console.log(`✓ Wrote ${SITEMAP} (${urls.length} URLs)`);
}

function buildFeed(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const items = sorted.map(p => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/post-${p.slug}.html</link>
      <guid>${SITE_URL}/blog/post-${p.slug}.html</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.dek)}</description>
      <category>${escapeXml(p.category)}</category>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Cintexa Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Web development, cloud architecture, software engineering, and digital systems insights from Cintexa.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
  fs.writeFileSync(FEED, xml, 'utf8');
  console.log(`✓ Wrote ${FEED} (${posts.length} items)`);
}

function categorySlugClass(category) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

function buildBlogIndexCards(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.map(p => `        <a href="post-${p.slug}.html" class="blog-card glass" data-reveal data-category="${categorySlugClass(p.category)}">
          <div class="blog-card-media"><span class="blog-card-cat">${escapeXml(p.category)}</span></div>
          <div class="blog-card-body">
            <h3>${escapeXml(p.title)}</h3>
            <p>${escapeXml(p.dek)}</p>
            <div class="blog-card-meta"><span>${p.date}</span><span>${p.readMinutes} min read</span></div>
          </div>
        </a>`).join('\n');
}

function injectIntoIndex(posts) {
  if (!fs.existsSync(BLOG_INDEX)) {
    console.warn(`⚠ ${BLOG_INDEX} does not exist yet — skipping card injection. Run after creating blog/index.html.`);
    return;
  }
  const html = fs.readFileSync(BLOG_INDEX, 'utf8');
  const startMarker = '<!-- BLOG_CARDS_START -->';
  const endMarker = '<!-- BLOG_CARDS_END -->';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn('⚠ Markers not found in blog/index.html — skipping card injection.');
    return;
  }

  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  const cards = buildBlogIndexCards(posts);
  const updated = `${before}\n${cards}\n        ${after}`;
  fs.writeFileSync(BLOG_INDEX, updated, 'utf8');
  console.log(`✓ Injected ${posts.length} cards into ${BLOG_INDEX}`);
}

function main() {
  const posts = loadPosts();
  buildSitemap(posts);
  buildFeed(posts);
  injectIntoIndex(posts);
  console.log(`\nDone. ${posts.length} post(s) processed.`);
}

main();
