/* ==========================================================================
   FAQ ACCORDION — expandable Q&A on blog posts
   ========================================================================== */

(function () {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      // Close any other open item for a cleaner single-open accordion feel.
      items.forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          const otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
})();
