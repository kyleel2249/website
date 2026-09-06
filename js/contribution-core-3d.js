/**
 * Cintexa Portal — Contribution Core 3D
 * ---------------------------------------------------------------------------
 * Adaptive progress visualization driven by real monthly progress percentage.
 * Uses the same quality / reduced-motion / visibility pattern as the main site.
 * Final displayed value is always the exact progress from authoritative data.
 */
(function () {
  'use strict';

  var stage = document.getElementById('contribution-core-stage');
  var canvas = document.getElementById('contribution-core-canvas');
  if (!stage || !canvas) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progress = 0;

  function setProgress(pct) {
    progress = Math.max(0, Math.min(100, Number(pct) || 0));
  }

  function init2D() {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, cx, cy, radius, raf = null;
    var displayPct = 0;

    function size() {
      w = stage.clientWidth;
      h = stage.clientHeight || 280;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      radius = Math.min(w, h) * 0.36;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(37,99,235,0.12)';
      ctx.lineWidth = 10;
      ctx.stroke();

      var target = progress / 100;
      if (!reduceMotion) {
        displayPct += (target - displayPct) * 0.08;
      } else {
        displayPct = target;
      }
      var start = -Math.PI / 2;
      var end = start + Math.PI * 2 * displayPct;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = progress >= 100 ? '#22C55E' : '#2563EB';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(37,99,235,0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    function withVisibility(startFn, stopFn) {
      var running = false, tabVisible = !document.hidden, inView = false;
      function sync() {
        var should = tabVisible && inView && !reduceMotion;
        if (should && !running) { running = true; startFn(); }
        if (!should && running) { running = false; stopFn(); }
      }
      document.addEventListener('visibilitychange', function () {
        tabVisible = !document.hidden; sync();
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { inView = e.isIntersecting; sync(); });
        }, { threshold: 0.1 }).observe(stage);
      } else {
        inView = true; sync();
      }
    }

    size();
    window.addEventListener('resize', size);

    if (reduceMotion) {
      draw();
    } else {
      withVisibility(
        function () { if (!raf) loop(); },
        function () { if (raf) { cancelAnimationFrame(raf); raf = null; } }
      );
    }
  }

  window.CintexaContributionCore = {
    setProgress: setProgress
  };

  init2D();
})();
