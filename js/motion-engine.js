/**
 * Cintexa Motion Engine — Central Controller
 * ---------------------------------------------------------------------------
 * Single source of truth for motion intensity, device capability, quality
 * tiers, reduced-motion, and shared utilities used by every visual scene.
 *
 * Existing scripts (scroll-3d.js, system-core-3d.js, flow-diagrams.js …)
 * continue to work. New scenes should import helpers from this module
 * via the global window.CintexaMotion namespace.
 *
 * Quality tiers:
 *   ULTRA  — desktop WebGL + full particles + high DPR
 *   HIGH   — desktop WebGL, moderate particles
 *   MEDIUM — capable tablet / mid desktop, 2D canvas preferred
 *   LOW    — mobile / low-memory, simplified 2D
 *   FALLBACK — reduced-motion, no-WebGL, or save-data → static or CSS only
 */
(function () {
  'use strict';

  var reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverNoneMQ = window.matchMedia('(hover: none)');
  var smallMQ = window.matchMedia('(max-width: 767px)');
  var narrowMQ = window.matchMedia('(max-width: 640px)');

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  var deviceMemory = (navigator.deviceMemory || 4);
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var cores = navigator.hardwareConcurrency || 4;
  var webgl = hasWebGL();

  function detectQuality() {
    if (reduceMotionMQ.matches || saveData) return 'FALLBACK';
    if (!webgl || deviceMemory <= 2 || cores <= 2 || narrowMQ.matches) return 'LOW';
    if (smallMQ.matches || deviceMemory <= 4) return 'MEDIUM';
    if (deviceMemory >= 8 && cores >= 6) return 'ULTRA';
    return 'HIGH';
  }

  var quality = detectQuality();

  var config = {
    quality: quality,
    reduceMotion: reduceMotionMQ.matches,
    isTouch: hoverNoneMQ.matches,
    isSmall: smallMQ.matches,
    isNarrow: narrowMQ.matches,
    cameraIntensity: quality === 'ULTRA' ? 1 : quality === 'HIGH' ? 0.75 : quality === 'MEDIUM' ? 0.4 : 0,
    particleDensity: quality === 'ULTRA' ? 1 : quality === 'HIGH' ? 0.6 : quality === 'MEDIUM' ? 0.3 : 0.1,
    nodeSpeed: quality === 'FALLBACK' ? 0 : 1,
    hoverIntensity: quality === 'FALLBACK' ? 0 : 1,
    scrollIntensity: quality === 'FALLBACK' ? 0 : (quality === 'LOW' ? 0.4 : 1),
    micro: 150,
    fast: 250,
    base: 400,
    slow: 600,
    system: 900,
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    blue: '#2563EB',
    purple: '#7C3AED',
    cyan: '#0EA5E9',
    navy: '#0F172A',
    green: '#22C55E'
  };

  function withVisibilityGate(element, startFn, stopFn) {
    var running = false;
    var tabVisible = !document.hidden;
    var inView = false;

    function sync() {
      var should = tabVisible && inView && !config.reduceMotion;
      if (should && !running) { running = true; startFn(); }
      if (!should && running) { running = false; stopFn(); }
    }

    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
      sync();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting;
          sync();
        });
      }, { threshold: 0.08, rootMargin: '40px 0px' });
      io.observe(element);
    } else {
      inView = true;
      sync();
    }

    return {
      forceStart: function () { inView = true; sync(); },
      forceStop: function () { inView = false; sync(); }
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function preferCanvas2D() {
    return config.quality === 'LOW' || config.quality === 'MEDIUM' || config.quality === 'FALLBACK' || !webgl;
  }

  window.CintexaMotion = {
    config: config,
    quality: quality,
    withVisibilityGate: withVisibilityGate,
    lerp: lerp,
    clamp: clamp,
    preferCanvas2D: preferCanvas2D,
    hasWebGL: webgl,
    setQuality: function (q) {
      if (['ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'FALLBACK'].indexOf(q) === -1) return;
      quality = q;
      config.quality = q;
      config.cameraIntensity = q === 'ULTRA' ? 1 : q === 'HIGH' ? 0.75 : q === 'MEDIUM' ? 0.4 : 0;
      config.particleDensity = q === 'ULTRA' ? 1 : q === 'HIGH' ? 0.6 : q === 'MEDIUM' ? 0.3 : 0.1;
      document.documentElement.dataset.cintexaQuality = q;
    }
  };

  document.documentElement.dataset.cintexaQuality = quality;

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var next = detectQuality();
      if (next !== quality) {
        window.CintexaMotion.setQuality(next);
      }
    }, 300);
  }, { passive: true });

  if (reduceMotionMQ.addEventListener) {
    reduceMotionMQ.addEventListener('change', function () {
      config.reduceMotion = reduceMotionMQ.matches;
      if (config.reduceMotion) {
        window.CintexaMotion.setQuality('FALLBACK');
      } else {
        window.CintexaMotion.setQuality(detectQuality());
      }
    });
  }
})();
