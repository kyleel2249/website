/**
 * Cintexa System Core — Signature “Connected Business Systems” Visual
 * ---------------------------------------------------------------------------
 * Enhanced adaptive visualization of the Cintexa connection layer.
 *
 * Rendering strategy (device-capability adaptive):
 *   ULTRA / HIGH  → lazy-loaded Three.js scene with layered geometry,
 *                   data pulses, subtle pointer-driven camera, node hover
 *   MEDIUM / LOW  → pure 2D canvas network (same information density)
 *   FALLBACK      → static CSS + semantic list only (no animation)
 *
 * Semantic content lives in <ul id="system-core-list"> for SEO / a11y / no-JS.
 * This script never replaces or hides that content.
 *
 * Depends on: js/motion-engine.js (optional but recommended)
 */
(function () {
  'use strict';

  var NODES = [
    { label: 'Cintexa Cloud',        desc: 'Infrastructure, hosting & scaling' },
    { label: 'Cintexa Apps',         desc: 'Custom software & dashboards' },
    { label: 'Cintexa Intelligence', desc: 'Reporting, forecasting & insights' },
    { label: 'Cintexa Inventory',    desc: 'Stock, orders, suppliers, forecasts' },
    { label: 'Custom Software',      desc: 'Applications, portals, automation' },
    { label: 'API & Integrations',   desc: 'CRM, payments, accounting, marketing' },
    { label: 'Business Intelligence',desc: 'Data into decisions' },
    { label: 'Automation',           desc: 'Fewer manual processes' },
    { label: 'Customer Experience',  desc: 'Connected front & back office' }
  ];

  var stage = document.getElementById('system-core-stage');
  var canvas = document.getElementById('system-core-canvas');
  var tooltip = document.getElementById('system-core-tooltip');
  var labelEl = document.getElementById('system-core-label');
  if (!stage || !canvas) return;

  var Motion = window.CintexaMotion || null;
  var cfg = Motion ? Motion.config : {
    quality: 'HIGH',
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isSmall: window.matchMedia('(max-width: 767px)').matches,
    cameraIntensity: 0.75,
    particleDensity: 0.6
  };

  if (cfg.reduceMotion || cfg.quality === 'FALLBACK') {
    if (labelEl) labelEl.textContent = 'CINTEXA';
    return;
  }

  function showTooltip(x, y, text) {
    if (!tooltip) return;
    tooltip.textContent = text;
    tooltip.style.transform = 'translate(' + (x + 14) + 'px,' + (y - 10) + 'px)';
    tooltip.classList.add('is-visible');
  }
  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('is-visible');
  }

  function withVisibilityGate(startFn, stopFn) {
    if (Motion && Motion.withVisibilityGate) {
      return Motion.withVisibilityGate(stage, startFn, stopFn);
    }
    var running = false, tabVisible = !document.hidden, inView = false;
    function sync() {
      var should = tabVisible && inView;
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
    } else { inView = true; sync(); }
  }

  function init2D() {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, cx, cy, radius, pulses = [];
    var raf = null;
    var hoverIndex = -1;
    var rot = 0;

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
      var angle = (i / total) * Math.PI * 2 - Math.PI / 2 + rot;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.72,
        angle: angle
      };
    }

    function seedPulses() {
      pulses = NODES.map(function (_, i) {
        return { node: i, t: Math.random(), speed: 0.003 + Math.random() * 0.0025, dir: 1 };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.08, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(37,99,235,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      NODES.forEach(function (n, i) {
        var p = nodePos(i, NODES.length);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = i === hoverIndex ? 'rgba(37,99,235,0.55)' : 'rgba(37,99,235,0.14)';
        ctx.lineWidth = i === hoverIndex ? 1.8 : 1;
        ctx.stroke();
      });

      pulses.forEach(function (pulse) {
        pulse.t += pulse.speed * pulse.dir;
        if (pulse.t > 1 || pulse.t < 0) {
          pulse.dir *= -1;
          pulse.t = Math.max(0, Math.min(1, pulse.t));
        }
        var p = nodePos(pulse.node, NODES.length);
        var x = cx + (p.x - cx) * pulse.t;
        var y = cy + (p.y - cy) * pulse.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,0.9)';
        ctx.fill();
      });

      NODES.forEach(function (n, i) {
        var p = nodePos(i, NODES.length);
        var isHover = i === hoverIndex;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHover ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? '#2563EB' : 'rgba(37,99,235,0.75)';
        ctx.fill();
        if (isHover) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(37,99,235,0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      grad.addColorStop(0, 'rgba(37,99,235,0.95)');
      grad.addColorStop(1, 'rgba(124,58,237,0.55)');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(37,99,235,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function loop() {
      rot += 0.0008;
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
        if (Math.hypot(mx - p.x, my - p.y) < 16) found = i;
      });
      hoverIndex = found;
      if (found >= 0) {
        showTooltip(mx, my, NODES[found].label + ' — ' + NODES[found].desc);
      } else {
        hideTooltip();
      }
    }

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', hideTooltip);
    window.addEventListener('resize', size);

    size();
    seedPulses();

    withVisibilityGate(
      function start() { if (!raf) loop(); },
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    );
  }

  function loadThree(callback) {
    if (window.THREE) { callback(); return; }
    if (labelEl) {
      labelEl.textContent = 'CONNECTED SYSTEM INITIALIZING…';
      labelEl.classList.add('is-loading');
    }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js';
    script.async = true;
    script.onload = function () {
      if (labelEl) {
        labelEl.textContent = 'CINTEXA';
        labelEl.classList.remove('is-loading');
      }
      callback();
    };
    script.onerror = function () {
      if (labelEl) {
        labelEl.textContent = 'CINTEXA';
        labelEl.classList.remove('is-loading');
      }
      init2D();
    };
    document.head.appendChild(script);
  }

  function init3D() {
    var THREE = window.THREE;
    var w = stage.clientWidth, h = stage.clientHeight;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(0, 0.2, 9.2);

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);

    var group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var key = new THREE.DirectionalLight(0x2563EB, 0.65);
    key.position.set(3, 4, 5);
    scene.add(key);

    var coreOuter = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 1),
      new THREE.MeshBasicMaterial({ color: 0x2563EB, wireframe: true, transparent: true, opacity: 0.55 })
    );
    group.add(coreOuter);

    var coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.38, 0),
      new THREE.MeshBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.85 })
    );
    group.add(coreInner);

    var ringGeo = new THREE.TorusGeometry(2.15, 0.012, 8, 64);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.18 });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    var nodeMeshes = [];
    var lineSegments = [];
    var radius = 3.5;

    NODES.forEach(function (n, i) {
      var angle = (i / NODES.length) * Math.PI * 2;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius * 0.58;
      var z = Math.sin(angle * 1.7) * 0.55;

      var nodeGeo = new THREE.SphereGeometry(0.13, 14, 14);
      var nodeMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED });
      var nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, y, z);
      nodeMesh.userData = { label: n.label, desc: n.desc, baseScale: 1 };
      group.add(nodeMesh);
      nodeMeshes.push(nodeMesh);

      var lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x, y, z)
      ]);
      var lineMat = new THREE.LineBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.22 });
      var line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
      lineSegments.push({ line: line, target: new THREE.Vector3(x, y, z) });
    });

    var pulseGeo = new THREE.SphereGeometry(0.04, 8, 8);
    var pulses = lineSegments.map(function (seg) {
      var mesh = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: 0x7C3AED }));
      group.add(mesh);
      return {
        mesh: mesh,
        target: seg.target,
        t: Math.random(),
        speed: 0.0035 + Math.random() * 0.0025,
        dir: 1
      };
    });

    var raycaster = new THREE.Raycaster();
    var pointerNdc = new THREE.Vector2(0, 0);
    var targetRotX = 0, targetRotY = 0;
    var currentRotX = 0, currentRotY = 0;
    var hovered = null;
    var intensity = cfg.cameraIntensity || 0.7;

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerNdc.set(nx, ny);
      targetRotY = nx * 0.32 * intensity;
      targetRotX = -ny * 0.18 * intensity;

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
      group.rotation.y += 0.0012;

      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;
      group.rotation.x = currentRotX;
      group.rotation.z = currentRotY * 0.15;

      var t = performance.now() * 0.001;
      coreOuter.rotation.y = t * 0.15;
      coreOuter.rotation.x = t * 0.08;
      coreInner.scale.setScalar(1 + Math.sin(t * 1.4) * 0.04);
      ring.rotation.z = t * 0.05;

      nodeMeshes.forEach(function (m) {
        var isHover = m === hovered;
        var s = isHover ? 1.55 : 1.0;
        m.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
        m.material.color.set(isHover ? 0x2563EB : 0x7C3AED);
      });

      pulses.forEach(function (p) {
        p.t += p.speed * p.dir;
        if (p.t > 1 || p.t < 0) {
          p.dir *= -1;
          p.t = Math.max(0, Math.min(1, p.t));
        }
        p.mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), p.target, p.t);
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    withVisibilityGate(
      function start() { if (!raf) loop(); },
      function stop() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      }
    );

    stage._cintexaDispose = function () {
      if (raf) cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }

  function init() {
    var prefer2D = (Motion && Motion.preferCanvas2D)
      ? Motion.preferCanvas2D()
      : (cfg.quality === 'LOW' || cfg.quality === 'MEDIUM' || cfg.isSmall || !window.WebGLRenderingContext);

    if (!prefer2D && (cfg.quality === 'ULTRA' || cfg.quality === 'HIGH')) {
      loadThree(function () {
        try {
          init3D();
        } catch (e) {
          console.warn('Cintexa System Core: WebGL init failed, using 2D fallback.', e);
          init2D();
        }
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
