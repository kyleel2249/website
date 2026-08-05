/* ==========================================================================
   CINTEXA MAIN — Enterprise Platform Edition
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
  const navLinks  = document.getElementById('nav-links');
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
    // Close on outside click
    document.addEventListener('click', e => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- Active nav link on scroll ----
  const sectionIds = ['services', 'inventory', 'software', 'cloud', 'intelligence',
                      'dashboard', 'case-studies', 'reviews', 'pricing', 'contact'];
  const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a'));

  function updateActiveNav() {
    let current = null;
    const scrollPos = window.scrollY + window.innerHeight * 0.3;
    sections.forEach(sec => { if (sec.offsetTop <= scrollPos) current = sec.id; });
    navAnchors.forEach(a => {
      const match = a.getAttribute('href') === `#${current}`;
      if (match) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  // ---- Scroll reveal (IntersectionObserver) ----
  const revealEls = document.querySelectorAll('[data-reveal]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function revealAll() { revealEls.forEach(el => el.classList.add('is-visible')); }

  if (reduceMotion.matches || !('IntersectionObserver' in window) || !revealEls.length) {
    revealAll();
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
    window.setTimeout(revealAll, 2500);
    window.addEventListener('beforeprint', revealAll);
  }

  // ---- Hero entrance animation ----
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    if (reduceMotion.matches) {
      heroEl.classList.add('hero-entered');
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        heroEl.classList.add('hero-entered');
      }));
    }
  }

  // ---- Number counter animation ----
  function animateCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target   = parseFloat(el.getAttribute('data-counter'));
      const suffix   = el.getAttribute('data-suffix') || '';
      const duration = 1800;
      const start    = performance.now();
      const isFloat  = !Number.isInteger(target);

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease     = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const value    = target * ease;
        el.textContent = (isFloat ? value.toFixed(target < 10 ? 1 : 0) : Math.round(value)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = (isFloat ? target.toFixed(target < 10 ? 1 : 0) : target) + suffix;
      }
      requestAnimationFrame(tick);
    });
  }

  // Trigger counters when hero stats enter view
  const statsEl = document.querySelector('.hero-stats');
  if (statsEl) {
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
      const counterIO = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          animateCounters();
          counterIO.disconnect();
        }
      }, { threshold: 0.5 });
      counterIO.observe(statsEl);
    } else {
      animateCounters();
    }
  }

  // ---- Copy-to-clipboard for code blocks ----
  document.querySelectorAll('.code-block-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      const target   = document.getElementById(targetId);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText);
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      } catch (e) { console.warn('Copy failed', e); }
    });
  });

  // ---- Contact form ----
  const CONTACT_ENDPOINT = (window.SUPABASE_URL || '') + '/functions/v1/contact';
  const contactForm   = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-form-status');

  function showStatus(msg, type) {
    if (!contactStatus) return;
    contactStatus.textContent = msg;
    contactStatus.className = `form-status is-visible is-${type}`;
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('contact-name').value.trim();
      const email   = document.getElementById('contact-email').value.trim();
      const company = document.getElementById('contact-company').value.trim();
      const message = document.getElementById('contact-message').value.trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (!name || !email || !message) { showStatus('Please fill in your name, email, and message.', 'error'); return; }
      if (!emailRe.test(email))        { showStatus('Please enter a valid email address.', 'error'); return; }

      const origText = submitBtn?.textContent;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      try {
        const res  = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY || ''}` },
          body: JSON.stringify({ name, email, company, message }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        showStatus(`Thanks, ${name.split(' ')[0]} — your message has been sent. We'll reply within one business day.`, 'success');
        contactForm.reset();
      } catch (err) {
        console.error('Contact form error:', err);
        showStatus("We couldn't send your message right now. Please email info@cintexa.com directly.", 'error');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      }
    });
  }

  // ---- Smooth-scroll for in-page anchors ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id     = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const offset = header ? header.offsetHeight + 16 : 80;
        const top    = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    });
  });

  // ---- Developer portal sidebar ----
  const devSidebarBtns = document.querySelectorAll('.dev-sidebar button');
  const devPanels      = document.querySelectorAll('.dev-content-panel');
  if (devSidebarBtns.length) {
    devSidebarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = 'panel-' + btn.getAttribute('data-panel');
        devSidebarBtns.forEach(b  => b.classList.remove('is-active'));
        devPanels.forEach(p       => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('is-active');
      });
    });
  }

  // ---- Diagnostics modal — wire up all trigger buttons ----
  const diagOverlay = document.getElementById('diag-overlay');
  const diagClose   = document.getElementById('diag-close');

  function openDiag() {
    if (!diagOverlay) return;
    diagOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    diagClose?.focus();
  }
  function closeDiag() {
    if (!diagOverlay) return;
    diagOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  ['open-diagnostics', 'open-diagnostics-hero', 'open-diagnostics-cta'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openDiag);
  });

  diagClose?.addEventListener('click', closeDiag);
  diagOverlay?.addEventListener('click', e => { if (e.target === diagOverlay) closeDiag(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDiag(); });

  // ---- Dashboard bar hover micro-interaction ----
  document.querySelectorAll('.dash-preview-bar').forEach(bar => {
    bar.addEventListener('mouseenter', () => bar.style.opacity = '1');
    bar.addEventListener('mouseleave', () => bar.style.opacity = '');
  });

})();
