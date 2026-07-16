/* ==========================================================================
   NETWORK GRAPH — signature visual element
   Nodes represent real platform pillars; edges pulse with animated packets
   to represent data flowing through Cintexa's connected architecture.
   Clicking a node scrolls to the matching section.
   ========================================================================== */

(function () {
  const canvas = document.getElementById('network-graph');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const NODES = [
    { id: 'core', label: 'CINTEXA CORE', href: '#hero', r: 26, primary: true },
    { id: 'software', label: 'Software', href: '#services', r: 15 },
    { id: 'cloud', label: 'Cloud', href: '#services', r: 15 },
    { id: 'api', label: 'API Layer', href: '#developer-portal', r: 15 },
    { id: 'web', label: 'Web Systems', href: '#services', r: 15 },
    { id: 'data', label: 'Diagnostics', href: '#diagnostics', r: 13 },
    { id: 'edge', label: 'Edge Network', href: '#roadmap', r: 13 },
  ];

  const EDGES = [
    ['core', 'software'], ['core', 'cloud'], ['core', 'api'],
    ['core', 'web'], ['core', 'data'], ['core', 'edge'],
    ['software', 'api'], ['cloud', 'edge'], ['web', 'data'],
  ];

  let width, height, dpr;
  const positions = {};
  let hovered = null;
  let raf = null;

  function layout() {
    const cx = width / 2;
    const cy = height / 2;
    const ringR = Math.min(width, height) * 0.36;
    positions.core = { x: cx, y: cy };
    const orbit = NODES.filter(n => n.id !== 'core');
    orbit.forEach((n, i) => {
      const angle = (i / orbit.length) * Math.PI * 2 - Math.PI / 2;
      positions[n.id] = {
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
        baseAngle: angle,
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = wrap.clientWidth;
    height = wrap.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  function colorFor(id) {
    if (id === 'core') return '#19D3FF';
    if (id === 'cloud' || id === 'edge') return '#1E6BFF';
    if (id === 'api' || id === 'data') return '#7C4DFF';
    return '#EAF2FF';
  }

  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // edges
    EDGES.forEach(([a, b], i) => {
      const pa = positions[a], pb = positions[b];
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(154, 174, 198, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!reduceMotion) {
        // animated packet traveling along the edge
        const speed = 0.00045;
        const phase = (t * speed + i * 0.37) % 1;
        const px = pa.x + (pb.x - pa.x) * phase;
        const py = pa.y + (pb.y - pa.y) * phase;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 5);
        grad.addColorStop(0, 'rgba(25,211,255,0.9)');
        grad.addColorStop(1, 'rgba(25,211,255,0)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // nodes
    NODES.forEach(n => {
      const p = positions[n.id];
      const isHover = hovered === n.id;
      const r = n.r + (isHover ? 3 : 0);
      const c = colorFor(n.id);

      ctx.beginPath();
      ctx.fillStyle = n.primary ? 'rgba(25,211,255,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = isHover ? 18 : 10;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `600 ${n.primary ? 11 : 10}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = isHover ? '#EAF2FF' : 'rgba(234,242,255,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(n.label.toUpperCase(), p.x, p.y + r + 16);
    });

    t += 16;
    if (!reduceMotion) raf = requestAnimationFrame(draw);
  }

  function hitNode(x, y) {
    for (const n of NODES) {
      const p = positions[n.id];
      const dx = x - p.x, dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.r + 8) return n;
    }
    return null;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getPos(e);
    const hit = hitNode(x, y);
    hovered = hit ? hit.id : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (reduceMotion) draw();
  });

  canvas.addEventListener('mouseleave', () => { hovered = null; if (reduceMotion) draw(); });

  canvas.addEventListener('click', (e) => {
    const { x, y } = getPos(e);
    const hit = hitNode(x, y);
    if (hit && hit.href) {
      const target = document.querySelector(hit.href);
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
