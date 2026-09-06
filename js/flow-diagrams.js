/**
 * Cintexa Flow Diagrams
 * -------------------------------------------------------------
 * Renders a compact horizontal node-and-flow animation for any
 * element matching [data-flow]. Nodes are evenly spaced across
 * the canvas width; small pulses travel left to right between
 * them to represent data/process flow (e.g. Warehouse -> Inventory
 * -> Order -> Customer). Pure 2D canvas, no dependency, and paused
 * whenever off-screen or the tab is hidden.
 *
 * The node COUNT is inferred from the sibling .flow-diagram-labels
 * spans, so the HTML labels stay the single source of truth.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var diagrams = document.querySelectorAll('[data-flow]');
  if (!diagrams.length) return;

  diagrams.forEach(function (host) {
    var canvas = host.querySelector('canvas');
    var labelsWrap = host.querySelector('.flow-diagram-labels');
    if (!canvas || !labelsWrap) return;
    var count = labelsWrap.querySelectorAll('span').length;
    if (count < 2) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, nodeX = [];
    var raf = null;
    var pulses = [];

    function size() {
      w = canvas.clientWidth || host.clientWidth;
      h = canvas.clientHeight || 64;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodeX = [];
      for (var i = 0; i < count; i++) {
        nodeX.push((w / (count - 1)) * i);
      }
    }

    function seedPulses() {
      pulses = [];
      for (var i = 0; i < count - 1; i++) {
        pulses.push({ seg: i, t: Math.random(), speed: 0.006 + Math.random() * 0.004 });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var midY = h / 2;

      // Connecting line
      ctx.beginPath();
      ctx.moveTo(nodeX[0], midY);
      ctx.lineTo(nodeX[count - 1], midY);
      ctx.strokeStyle = 'rgba(37,99,235,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pulses traveling along each segment
      if (!reduceMotion) {
        pulses.forEach(function (p) {
          p.t += p.speed;
          if (p.t > 1) p.t = 0;
          var x = nodeX[p.seg] + (nodeX[p.seg + 1] - nodeX[p.seg]) * p.t;
          ctx.beginPath();
          ctx.arc(x, midY, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(124,58,237,0.85)';
          ctx.fill();
        });
      }

      // Nodes
      nodeX.forEach(function (x) {
        ctx.beginPath();
        ctx.arc(x, midY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, midY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37,99,235,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    size();
    seedPulses();
    window.addEventListener('resize', function () { size(); });

    if (reduceMotion) {
      draw(); // static single frame, no animation loop
      return;
    }

    if ('IntersectionObserver' in window) {
      var inView = false, tabVisible = !document.hidden;
      function sync() {
        var should = inView && tabVisible;
        if (should && !raf) loop();
        if (!should && raf) { cancelAnimationFrame(raf); raf = null; }
      }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { inView = e.isIntersecting; sync(); });
      }, { threshold: 0.15 }).observe(host);
      document.addEventListener('visibilitychange', function () {
        tabVisible = !document.hidden;
        sync();
      });
    } else {
      loop();
    }
  });
})();
