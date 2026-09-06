/**
 * Cintexa System Core
 * -------------------------------------------------------------
 * The "Cintexa Connection" signature visual: a central node
 * connected to the company's core capabilities, with data pulses
 * traveling along each connection.
 *
 * Rendering strategy (device-capability adaptive, per the site's
 * existing reduced-motion / mobile-first conventions):
 *   - Desktop + WebGL + no reduced-motion  -> lazy-loaded Three.js scene
 *   - Everything else (mobile, low-power,
 *     reduced motion, no WebGL, slow network) -> lightweight 2D canvas
 *     network drawing the same information, no external dependency
 *
 * Either way the semantic <ul id="system-core-list"> already in the
 * HTML carries the real content for SEO / screen readers / no-JS —
 * this script only adds a visual layer on top of it.
 */
(function () {
  'use strict';

  var NODES = [
    { label: 'Cintexa Cloud', desc: 'Infrastructure & hosting' },
    { label: 'Cintexa Apps', desc: 'Custom software & dashboards' },
    { label: 'Cintexa Intelligence', desc: 'Reporting & forecasting' },
    { label: 'Cintexa Inventory', desc: 'Stock, orders, suppliers' },
    { label: 'Custom Software', desc: 'Applications & portals' },
    { label: 'API & Integrations', desc: 'CRM, payments, accounting' },
    { label: 'Business Intelligence', desc: 'Data into decisions' },
    { label: 'Automation', desc: 'Fewer manual processes' },
    { label: 'Customer Experience', desc: 'Connected front & back office' }
  ];

  var stage = document.getElementById('system-core-stage');
  var canvas = document.getElementById('system-core-canvas');
  var tooltip = document.getElementById('system-core-tooltip');
  if (!stage || !canvas) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = window.matchMedia('(max-width: 767px)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var lowMemory = !!(navigator.deviceMemory && navigator.deviceMemory <= 2);

  function hasWebGL() {
    try {
      var test = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (test.getContext('webgl') || test.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  var useWebGL = !reduceMotion && !isSmall && !saveData && !lowMemory && hasWebGL();

  function showTooltip(x, y, text) {
    if (!tooltip) return;
    tooltip.textContent = text;
    tooltip.style.transform = 'translate(' + (x + 14) + 'px,' + (y - 10) + 'px)';
    tooltip.classList.add('is-visible');
  }
  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('is-visible');
  }

  /* Only render while the stage is actually on screen, and never
     while the tab is hidden — keeps this from burning CPU/GPU
     off-screen or in background tabs. */
  function withVisibilityGate(startFn, stopFn) {
    var running = false;
    var tabVisible = !document.hidden;
    var inView = false;

    function sync() {
      var shouldRun = tabVisible && inView;
      if (shouldRun && !running) { running = true; startFn(); }
      if (!shouldRun && running) { running = false; stopFn(); }
    }

    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
      sync();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { inView = e.isIntersecting; sync(); });
      }, { threshold: 0.1 });
      io.observe(stage);
    } else {
      inView = true;
      sync();
    }
  }

  /* ---------------------------------------------------------------
     2D CANVAS FALLBACK — no external dependency, always correct
  --------------------------------------------------------------- */
  function init2D() {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, cx, cy, radius, pulses = [];
    var raf = null;

    function size() {
      w = stage.clientWidth;
      h = stage.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      radius = Math.min(w, h) * 0.36;
    }

    function nodePos(i, total) {
      var angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, angle: angle };
    }

    function seedPulses() {
      pulses = NODES.map(function (_, i) {
        return { node: i, t: Math.random(), speed: 0.0035 + Math.random() * 0.002, dir: 1 };
      });
    }

    var hoverIndex = -1;

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Connections
      NODES.forEach(function (n, i) {
        var p = nodePos(i, NODES.length);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = i === hoverIndex ? 'rgba(37,99,235,0.55)' : 'rgba(37,99,235,0.16)';
        ctx.lineWidth = i === hoverIndex ? 1.8 : 1;
        ctx.stroke();
      });

      // Data pulses traveling along each connection
      pulses.forEach(function (pulse) {
        pulse.t += pulse.speed * pulse.dir;
        if (pulse.t > 1 || pulse.t < 0) { pulse.dir *= -1; pulse.t = Math.max(0, Math.min(1, pulse.t)); }
        var p = nodePos(pulse.node, NODES.length);
        var x = cx + (p.x - cx) * pulse.t;
        var y = cy + (p.y - cy) * pulse.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,0.85)';
        ctx.fill();
      });

      // Nodes
      NODES.forEach(function (n, i) {
        var p = nodePos(i, NODES.length);
        var isHover = i === hoverIndex;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHover ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? '#2563EB' : 'rgba(37,99,235,0.7)';
        ctx.fill();
        if (isHover) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(37,99,235,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Center core
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
      grad.addColorStop(0, 'rgba(37,99,235,0.9)');
      grad.addColorStop(1, 'rgba(124,58,237,0.55)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function loop() {
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var found = -1;
      NODES.forEach(function (n, i) {
        var p = nodePos(i, NODES.length);
        if (Math.hypot(mx - p.x, my - p.y) < 14) found = i;
      });
      hoverIndex = found;
      if (found >= 0) {
        showTooltip(mx, my, NODES[found].label + ' — ' + NODES[found].desc);
      } else {
        hideTooltip();
      }
    }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', hideTooltip);
    window.addEventListener('resize', size);

    size();
    seedPulses();

    withVisibilityGate(
      function start() { if (!raf) loop(); },
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    );
  }

  /* ---------------------------------------------------------------
     WEBGL PATH — lazy-loads Three.js only for capable desktops
  --------------------------------------------------------------- */
  function loadThree(callback) {
    if (window.THREE) { callback(); return; }
    setInitializingLabel(true);
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js';
    script.async = true;
    script.onload = function () { setInitializingLabel(false); callback(); };
    script.onerror = function () { setInitializingLabel(false); init2D(); }; // network hiccup -> fall back rather than break
    document.head.appendChild(script);
  }

  function setInitializingLabel(loading) {
    var label = document.getElementById('system-core-label');
    if (!label) return;
    label.textContent = loading ? 'CONNECTED SYSTEM INITIALIZING…' : 'CINTEXA';
    label.classList.toggle('is-loading', loading);
  }

  function init3D() {
    var THREE = window.THREE;
    var w = stage.clientWidth, h = stage.clientHeight;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 9);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);

    var group = new THREE.Group();
    scene.add(group);

    // Center core
    var coreGeo = new THREE.IcosahedronGeometry(0.55, 1);
    var coreMat = new THREE.MeshBasicMaterial({ color: 0x2563EB, wireframe: true, transparent: true, opacity: 0.85 });
    var core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    var nodeMeshes = [];
    var lineSegments = [];
    var radius = 3.4;

    NODES.forEach(function (n, i) {
      var angle = (i / NODES.length) * Math.PI * 2;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius * 0.62;
      var z = Math.sin(angle * 2) * 0.6;

      var nodeGeo = new THREE.SphereGeometry(0.14, 16, 16);
      var nodeMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED });
      var nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, y, z);
      nodeMesh.userData = { label: n.label, desc: n.desc };
      group.add(nodeMesh);
      nodeMeshes.push(nodeMesh);

      var lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z)
      ]);
      var lineMat = new THREE.LineBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.25 });
      var line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
      lineSegments.push({ line: line, target: new THREE.Vector3(x, y, z) });
    });

    // Data pulses: small points interpolating from center to each node
    var pulseGeo = new THREE.SphereGeometry(0.045, 8, 8);
    var pulseMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED });
    var pulses = lineSegments.map(function (seg, i) {
      var mesh = new THREE.Mesh(pulseGeo, pulseMat.clone());
      group.add(mesh);
      return { mesh: mesh, target: seg.target, t: Math.random(), speed: 0.004 + Math.random() * 0.003, dir: 1 };
    });

    var raycaster = new THREE.Raycaster();
    var pointerNdc = new THREE.Vector2(0, 0);
    var targetRotX = 0, targetRotY = 0;
    var currentRotX = 0, currentRotY = 0;
    var hovered = null;

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerNdc.set(nx, ny);
      targetRotY = nx * 0.35;
      targetRotX = -ny * 0.2;

      raycaster.setFromCamera(pointerNdc, camera);
      var hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length) {
        hovered = hits[0].object;
        showTooltip(e.clientX - rect.left, e.clientY - rect.top,
          hovered.userData.label + ' — ' + hovered.userData.desc);
      } else {
        hovered = null;
        hideTooltip();
      }
    }
    function onPointerLeave() {
      hovered = null;
      hideTooltip();
      targetRotX = 0;
      targetRotY = 0;
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    function onResize() {
      w = stage.clientWidth; h = stage.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    var raf = null;
    function loop() {
      group.rotation.y += 0.0015; // slow autonomous rotation
      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;
      group.rotation.x = currentRotX;

      nodeMeshes.forEach(function (m) {
        var isHover = m === hovered;
        var s = isHover ? 1.6 : 1.0;
        m.scale.set(s, s, s);
        m.material.color.set(isHover ? 0x2563EB : 0x7C3AED);
      });

      pulses.forEach(function (p) {
        p.t += p.speed * p.dir;
        if (p.t > 1 || p.t < 0) { p.dir *= -1; p.t = Math.max(0, Math.min(1, p.t)); }
        p.mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), p.target, p.t);
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    withVisibilityGate(
      function start() { if (!raf) loop(); },
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    );
  }

  function init() {
    if (useWebGL) {
      loadThree(function () {
        try { init3D(); } catch (e) { console.warn('Cintexa System Core: WebGL init failed, using 2D fallback.', e); init2D(); }
      });
    } else {
      init2D();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
