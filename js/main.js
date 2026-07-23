/* ==========================================================================
   MAIN SITE BEHAVIOR
   ========================================================================== */

(function () {
  // ---- Header scroll state ----
  const header = document.getElementById('site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile nav toggle ----
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Active nav link on scroll ----
  const sections = ['services', 'ecosystem', 'developer-portal', 'case-studies', 'pricing', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a'));

  function updateActiveNav() {
    let current = null;
    const scrollPos = window.scrollY + window.innerHeight * 0.3;
    sections.forEach(sec => {
      if (sec.offsetTop <= scrollPos) current = sec.id;
    });
    navAnchors.forEach(a => {
      const match = a.getAttribute('href') === `#${current}`;
      a.toggleAttribute('aria-current', match);
      if (match) a.setAttribute('aria-current', 'page');
    });
  }
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // ---- Scroll reveal ----
  // Defensive design: reveal animations should never be able to permanently hide
  // content. If IntersectionObserver fails to fire for any reason (a tab restored
  // from cache, a crawler/screenshot tool that doesn't scroll, a slow paint before
  // observer registration), a fallback timer forces visibility after a short delay.
  const revealEls = document.querySelectorAll('[data-reveal]');
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function revealAll() {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  if (reduceMotionQuery.matches || !('IntersectionObserver' in window) || !revealEls.length) {
    revealAll();
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));

    // Safety net: force-reveal anything still hidden after 2.5s, regardless of
    // scroll position. Prevents permanently invisible content in edge cases.
    window.setTimeout(revealAll, 2500);

    // Also reveal everything immediately on print, since print doesn't scroll.
    window.addEventListener('beforeprint', revealAll);
  }

  // ---- Copy-to-clipboard for code blocks ----
  document.querySelectorAll('.code-block-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      const target = document.getElementById(targetId);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText);
        const original = btn.innerHTML;
        btn.innerHTML = btn.innerHTML.replace('Copy', 'Copied');
        setTimeout(() => { btn.innerHTML = original; }, 1600);
      } catch (e) {
        console.warn('Copy failed', e);
      }
    });
  });

  // ---- Contact form ----
  // Sends the message to a Cloudflare Worker (see /worker/contact-worker.js), which
  // delivers it as an email to info@cintexa.com via Resend. Update CONTACT_ENDPOINT
  // below to your deployed Worker URL before going live.
  const CONTACT_ENDPOINT = (window.SUPABASE_URL || '') + '/functions/v1/contact';

  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-form-status');

  function showStatus(msg, type) {
    if (!contactStatus) return;
    contactStatus.textContent = msg;
    contactStatus.className = `form-status is-visible is-${type}`;
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name').value.trim();
      const email = document.getElementById('contact-email').value.trim();
      const company = document.getElementById('contact-company').value.trim();
      const message = document.getElementById('contact-message').value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (!name || !email || !message) {
        showStatus('Please fill in your name, email, and message.', 'error');
        return;
      }
      if (!emailPattern.test(email)) {
        showStatus('Please enter a valid email address.', 'error');
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      try {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY || ''}`,
          },
          body: JSON.stringify({ name, email, company, message }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Something went wrong. Please try again.');
        }

        showStatus(`Thanks, ${name.split(' ')[0]} — your message has been sent. We'll reply within one business day.`, 'success');
        contactForm.reset();
      } catch (err) {
        console.error('Contact form error:', err);
        showStatus("We couldn't send your message right now. Please email info@cintexa.com directly.", 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  // ---- Smooth-scroll for in-page anchors (respects reduced motion) ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotionQuery.matches ? 'auto' : 'smooth' });
      }
    });
  });

  // ---- Developer portal sidebar (mock UI: buttons, not links, so no navigation/scroll side effects) ----
  const devSidebarButtons = document.querySelectorAll('.dev-sidebar button');
  if (devSidebarButtons.length) {
    devSidebarButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        devSidebarButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  // ---- Hero entrance animation ----
  // Uses two rAF calls so the browser has committed one paint with elements in
  // their initial hidden state before the animation class is added.
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    if (reduceMotionQuery.matches) {
      // Skip animation entirely — immediately reveal all data-hero elements.
      heroEl.classList.add('hero-entered');
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heroEl.classList.add('hero-entered');
        });
      });
    }
  }
})();
