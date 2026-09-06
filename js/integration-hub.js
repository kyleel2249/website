/**
 * Cintexa Integration Hub
 * -------------------------------------------------------------
 * A small radial hub-and-spoke visual: CINTEXA API at the center,
 * connected to the real integration categories the Developer
 * Portal actually documents. Data packets pulse from the center
 * out to each connected system and back, representing live sync.
 *
 * Positions the HTML labels (already in the markup, so they're
 * real accessible/SEO text) to sit next to their matching node.
 * Pure 2D canvas — no dependency, always renders something.
 */
(function () {
  'use strict';

  var host = document.getElementById('integration-hub');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var labelEls = Array.prototype.slice.call(host.querySelectorAll('[data-hub-label]'));
  if (!canvas || !labelEls.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, cx, cy, radius;
  var pulses = [];
  var raf = null;
  var count = labelEls.length;

  function nodePos(i) {
    var angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  }

  function size() {
    w = host.clientWidth;
    h = host.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2;
    radius = Math.min(w, h) * 0.34;

    labelEls.forEach(function (el, i) {
      var p = nodePos(i);
      var pctX = (p.x / w) * 100;
      var pctY = (p.y / h) * 100;
      el.style.left = pctX + '%';
      el.style.top = pctY + '%';
    });
  }

  function seedPulses() {
    pulses = [];
    for (var i = 0; i < count; i++) {
      pulses.push({ node: i, t: Math.random(), dir: 1, speed: 0.004 + Math.random() * 0.003 });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < count; i++) {
      var p = nodePos(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(124,58,237,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (!reduceMotion) {
      pulses.forEach(function (pulse) {
        pulse.t += pulse.speed * pulse.dir;
        if (pulse.t > 1 || pulse.t < 0) { pulse.dir *= -1; pulse.t = Math.max(0, Math.min(1, pulse.t)); }
        var p = nodePos(pulse.node);
        var x = cx + (p.x - cx) * pulse.t;
        var y = cy + (p.y - cy) * pulse.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37,99,235,0.85)';
        ctx.fill();
      });
    }

    for (var j = 0; j < count; j++) {
      var np = nodePos(j);
      ctx.beginPath();
      ctx.arc(np.x, np.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,58,237,0.75)';
      ctx.fill();
    }

    // Center — Cintexa API core
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    grad.addColorStop(0, 'rgba(37,99,235,0.9)');
    grad.addColorStop(1, 'rgba(124,58,237,0.5)');
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function loop() {
    draw();
    raf = requestAnimationFrame(loop);
  }

  size();
  seedPulses();
  window.addEventListener('resize', size);

  if (reduceMotion) {
    draw();
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
    document.addEventListener('visibilitychange', function () { tabVisible = !document.hidden; sync(); });
  } else {
    loop();
  }
})();
