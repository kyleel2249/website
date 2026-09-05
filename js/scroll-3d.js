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
     2. Mouse-follow 3D tilt cards
  --------------------------------------------------------------- */
  function initTiltCards() {
    var cards = document.querySelectorAll('[data-tilt]');
    if (!cards.length) return;
    var MAX_TILT = 10; // degrees

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
