/**
 * Cintexa 3D Scroll System
 * -------------------------------------------------------------
 * Adds depth to the existing scroll-reveal system (main.js already
 * toggles .is-visible on [data-reveal] via IntersectionObserver —
 * this file does NOT duplicate that, it only adds new behaviors):
 *
 *   1. Scroll progress bar fixed to the top of the viewport
 *   2. Mouse-follow 3D tilt on [data-tilt] cards (desktop) with a
 *      gyroscope-free scroll-based fallback tilt on touch devices
 *   3. Parallax depth layers on [data-parallax] elements
 *   4. Section "depth recede" — sections push back in Z-space and
 *      dim slightly once scrolled past, for a layered feel
 *   5. A pop-in animation for stat counters when they enter view
 *
 * Fully no-op under prefers-reduced-motion (adds html.reduce-motion,
 * which scroll-3d.css uses to flatten every 3D effect instantly).
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyReducedMotionClass() {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion.matches);
  }
  applyReducedMotionClass();
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', applyReducedMotionClass);
  }

  if (reduceMotion.matches) return; // nothing else to wire up

  /* ---------------------------------------------------------------
     1. Scroll progress bar
  --------------------------------------------------------------- */
  function initProgressBar() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------
     2. Mouse-follow 3D tilt cards (desktop) / tap-tilt (touch)
  --------------------------------------------------------------- */
  function initTiltCards() {
    var cards = document.querySelectorAll('[data-tilt]');
    if (!cards.length) return;

    var isTouch = window.matchMedia('(hover: none)').matches;
    var isSmall = window.matchMedia('(max-width: 640px)').matches;
    var MAX_TILT = isSmall ? 5 : (isTouch ? 6 : 10); // degrees, capped down for small/touch screens

    if (isTouch) {
      // Touch devices: brief 3D "settle" tilt on tap instead of a mouse follow
      cards.forEach(function (card) {
        card.addEventListener('touchstart', function () {
          card.classList.add('tilt-tap');
        }, { passive: true });
        card.addEventListener('touchend', function () {
          window.setTimeout(function () { card.classList.remove('tilt-tap'); }, 400);
        }, { passive: true });
      });
      return;
    }

    cards.forEach(function (card) {
      var frame = null;

      function onMove(e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;  // 0..1
        var y = (e.clientY - rect.top) / rect.height;  // 0..1
        var rotateY = (x - 0.5) * (MAX_TILT * 2);
        var rotateX = (0.5 - y) * (MAX_TILT * 2);

        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function () {
          card.style.transform =
            'perspective(1000px) rotateX(' + rotateX.toFixed(2) + 'deg) ' +
            'rotateY(' + rotateY.toFixed(2) + 'deg) translateZ(6px)';
        });
      }

      function onLeave() {
        if (frame) cancelAnimationFrame(frame);
        card.style.transform = '';
        card.classList.remove('tilt-active');
      }

      function onEnter() {
        card.classList.add('tilt-active');
      }

      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointerleave', onLeave);
    });
  }

  /* ---------------------------------------------------------------
     2b. Magnetic buttons — CTAs pull slightly toward the cursor
  --------------------------------------------------------------- */
  function initMagneticButtons() {
    if (window.matchMedia('(hover: none)').matches) return; // desktop only
    var buttons = document.querySelectorAll('[data-magnetic]');
    if (!buttons.length) return;
    var RADIUS = 60; // px of pull travel
    var STRENGTH = 0.35;

    buttons.forEach(function (btn) {
      function onMove(e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - (rect.left + rect.width / 2);
        var y = e.clientY - (rect.top + rect.height / 2);
        var dx = Math.max(-RADIUS, Math.min(RADIUS, x)) * STRENGTH;
        var dy = Math.max(-RADIUS, Math.min(RADIUS, y)) * STRENGTH;
        btn.style.transform = 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px)';
      }
      function onLeave() {
        btn.style.transform = '';
      }
      btn.addEventListener('pointermove', onMove);
      btn.addEventListener('pointerleave', onLeave);
    });
  }

  /* ---------------------------------------------------------------
     2c. Cursor spotlight on the hero (desktop only)
  --------------------------------------------------------------- */
  function initSpotlight() {
    if (window.matchMedia('(hover: none)').matches) return;
    var hero = document.querySelector('.hero[data-spotlight]');
    if (!hero) return;
    var frame = null;

    hero.addEventListener('pointermove', function (e) {
      var rect = hero.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        hero.style.setProperty('--spot-x', x.toFixed(1) + '%');
        hero.style.setProperty('--spot-y', y.toFixed(1) + '%');
        hero.classList.add('spotlight-active');
      });
    });
    hero.addEventListener('pointerleave', function () {
      hero.classList.remove('spotlight-active');
    });
  }

  /* ---------------------------------------------------------------
     2d. Back to top — 3D rotate-in control
  --------------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'back-to-top';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '&uarr;';
      document.body.appendChild(btn);
    }
    var ticking = false;
    function update() {
      var show = (document.documentElement.scrollTop || document.body.scrollTop) > 480;
      btn.classList.toggle('is-visible', show);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
    update();
  }

  /* ---------------------------------------------------------------
     3. Parallax depth layers — element moves opposite to scroll at
        a rate controlled by data-speed (default 0.15)
  --------------------------------------------------------------- */
  function initParallax() {
    var layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length) return;
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-speed')) || 0.15;
        var rect = el.getBoundingClientRect();
        var centerOffset = (rect.top + rect.height / 2) - vh / 2;
        var translateY = centerOffset * speed * -1;
        el.style.transform = 'translate3d(0, ' + translateY.toFixed(1) + 'px, 0)';
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------------------------------------
     4. Section depth recede — once a [data-depth] section is mostly
        scrolled past (above the viewport), push it back in Z-space
  --------------------------------------------------------------- */
  function initDepthRecede() {
    var sections = document.querySelectorAll('[data-depth]');
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var passedUpward = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
        entry.target.classList.toggle('depth-recede', passedUpward);
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------------
     5. Stat counter 3D pop-in (visual only — main.js drives the
        actual counting logic already)
  --------------------------------------------------------------- */
  function initCountPop() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('count-pop');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach(function (c) { io.observe(c); });
  }

  function init() {
    initProgressBar();
    initTiltCards();
    initParallax();
    initDepthRecede();
    initCountPop();
    initMagneticButtons();
    initSpotlight();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
