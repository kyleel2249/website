/* ==========================================================================
   BUSINESS DIAGNOSTICS ENGINE
   20 questions across 4 categories. Each option carries a 0-4 point value.
   Category score = (points earned / points possible) * 100.
   Overall score = average of category scores.
   Recommendations are selected by the lowest-scoring categories.
   ========================================================================== */

(function () {
  const CATEGORIES = {
    digital: { label: 'Digital Maturity', color: '#19D3FF' },
    ops: { label: 'Operational Efficiency', color: '#1E6BFF' },
    web: { label: 'Web Presence Strength', color: '#7C4DFF' },
    cloud: { label: 'Cloud Readiness', color: '#2BD9A0' },
  };

  // Each question: 5 options worth 0,1,2,3,4 points (low -> high maturity)
  const QUESTIONS = [
    // --- Digital Maturity (5) ---
    { id: 'd1', cat: 'digital', q: 'How does your team primarily track tasks and projects?', opts: [
      'Email and memory', 'Spreadsheets', 'A mix of spreadsheets and one tool', 'A dedicated project management tool', 'A fully integrated PM system tied to other tools'] },
    { id: 'd2', cat: 'digital', q: 'How is customer or client data stored?', opts: [
      'Scattered across emails and notes', 'Local spreadsheets', 'A basic CRM, used inconsistently', 'A CRM the whole team uses', 'A CRM integrated with billing, support, and marketing'] },
    { id: 'd3', cat: 'digital', q: 'How do new employees get access to the tools they need?', opts: [
      'Manual, ad-hoc setup with no checklist', 'A basic checklist followed sometimes', 'A documented onboarding checklist', 'Automated account provisioning for most tools', 'Fully automated provisioning with role-based access'] },
    { id: 'd4', cat: 'digital', q: 'How does leadership access business performance data?', opts: [
      'It is requested manually when needed', 'Periodic manual reports', 'A monthly dashboard someone builds by hand', 'A live dashboard updated automatically', 'Real-time dashboards across all departments'] },
    { id: 'd5', cat: 'digital', q: 'How are internal processes documented?', opts: [
      'They are not documented', 'Documented in scattered documents', 'A shared but disorganized knowledge base', 'An organized, current knowledge base', 'A living, versioned internal wiki tied to workflows'] },

    // --- Operational Efficiency (5) ---
    { id: 'o1', cat: 'ops', q: 'How much manual data re-entry happens between your tools?', opts: [
      'Constant — most data is re-typed between systems', 'Frequent', 'Occasional, for a few workflows', 'Rare — most systems sync automatically', 'None — full automation across systems'] },
    { id: 'o2', cat: 'ops', q: 'How are repetitive tasks (invoicing, scheduling, follow-ups) handled?', opts: [
      'Entirely manual', 'Manual with checklists', 'Partially automated', 'Mostly automated with manual review', 'Fully automated with exception-based review'] },
    { id: 'o3', cat: 'ops', q: 'How long does it take to generate a report leadership needs?', opts: [
      'Days', 'About a day', 'A few hours', 'Under an hour', 'Instant — it already exists'] },
    { id: 'o4', cat: 'ops', q: 'How do departments share information with each other?', opts: [
      'Ad-hoc emails and verbal updates', 'Shared spreadsheets', 'A shared tool, used inconsistently', 'A shared tool used consistently', 'Fully integrated systems with no manual handoff'] },
    { id: 'o5', cat: 'ops', q: 'How confident are you in your current operating costs per process?', opts: [
      'No visibility at all', 'Rough estimates only', 'Visibility into a few key processes', 'Clear visibility into most processes', 'Granular, real-time cost visibility everywhere'] },

    // --- Web Presence Strength (5) ---
    { id: 'w1', cat: 'web', q: 'How would you describe your website\'s mobile performance?', opts: [
      'Slow or broken on mobile', 'Usable but slow', 'Acceptable', 'Fast and responsive', 'Optimized — sub-2-second loads, fully responsive'] },
    { id: 'w2', cat: 'web', q: 'How is your site structured for search visibility (SEO)?', opts: [
      'No SEO work has been done', 'Basic page titles only', 'Some on-page SEO', 'Strong on-page SEO with regular content', 'Full technical + content SEO program'] },
    { id: 'w3', cat: 'web', q: 'How easily can you update content on your website?', opts: [
      'Requires a developer for any change', 'Requires a developer for most changes', 'Some self-service via a CMS', 'Most content is self-service', 'Fully self-service with no developer needed'] },
    { id: 'w4', cat: 'web', q: 'How does your site convert visitors into leads or customers?', opts: [
      'No clear conversion path', 'A single generic contact form', 'A few calls-to-action, untested', 'Tested calls-to-action with decent conversion', 'A continuously optimized, tracked conversion funnel'] },
    { id: 'w5', cat: 'web', q: 'How is your website hosted and secured?', opts: [
      'Unsure / managed by someone no longer involved', 'Shared hosting, no CDN', 'Standard hosting with basic SSL', 'CDN-backed hosting with strong security headers', 'Edge-distributed hosting with WAF and DDoS protection'] },

    // --- Cloud Readiness (5) ---
    { id: 'c1', cat: 'cloud', q: 'Where does your business-critical data live today?', opts: [
      'Local machines only', 'A mix of local and shared drives', 'A single cloud provider, partially used', 'A primary cloud provider, used consistently', 'A fully cloud-native, redundant setup'] },
    { id: 'c2', cat: 'cloud', q: 'What happens if your main work laptop is lost or damaged tomorrow?', opts: [
      'Significant data loss', 'Some data loss, major disruption', 'Minor disruption, most data is backed up', 'Minimal disruption — nearly everything is cloud-synced', 'No disruption — fully cloud-based workflows'] },
    { id: 'c3', cat: 'cloud', q: 'How does your infrastructure handle sudden traffic or usage spikes?', opts: [
      'It would likely go down', 'It would slow significantly', 'It would hold but degrade', 'It would scale with some manual intervention', 'It scales automatically with no manual intervention'] },
    { id: 'c4', cat: 'cloud', q: 'How are backups and disaster recovery handled?', opts: [
      'No formal backup process', 'Occasional manual backups', 'Scheduled backups, untested recovery', 'Scheduled backups with periodic recovery testing', 'Automated backups with regularly tested recovery'] },
    { id: 'c5', cat: 'cloud', q: 'How much of your monthly cloud spend can you account for?', opts: [
      'None — costs are a surprise each month', 'Roughly half', 'Most of it', 'Nearly all of it, with some optimization', 'Fully accounted for with active cost optimization'] },
  ];

  const TOTAL_QUESTIONS = QUESTIONS.length;
  const MAX_PER_Q = 4;

  // Recommendation library keyed by category, ordered low->high score relevance
  const RECOMMENDATIONS = {
    digital: {
      title: 'Digital Maturity',
      low: { h: 'Consolidate scattered tools into one system', p: 'Centralize task tracking and customer data into a single connected platform so information stops living in inboxes and spreadsheets.' },
      mid: { h: 'Automate onboarding and reporting', p: 'Replace manual checklists with automated provisioning and build a live performance dashboard leadership can check anytime.' },
    },
    ops: {
      title: 'Operational Efficiency',
      low: { h: 'Eliminate manual re-entry between systems', p: 'Connect your existing tools through an API integration layer so data entered once flows everywhere it is needed.' },
      mid: { h: 'Automate your highest-volume repetitive tasks', p: 'Identify the 2-3 most repeated manual workflows — invoicing, scheduling, follow-ups — and automate them first for the fastest payback.' },
    },
    web: {
      title: 'Web Presence Strength',
      low: { h: 'Rebuild on a performance-first architecture', p: 'A CDN-optimized, mobile-first rebuild will resolve slow load times and give you a foundation to build SEO and conversion on top of.' },
      mid: { h: 'Strengthen SEO and conversion tracking', p: 'Layer in structured technical SEO and a tested conversion funnel so existing traffic converts at a higher rate.' },
    },
    cloud: {
      title: 'Cloud Readiness',
      low: { h: 'Move critical data off local machines', p: 'Migrate business-critical files and systems to a redundant cloud provider before a single lost device becomes a major incident.' },
      mid: { h: 'Build automated, tested backups and autoscaling', p: 'Move from manual backups to automated, regularly tested disaster recovery, and add autoscaling so traffic spikes don\'t cause outages.' },
    },
  };

  let currentStep = 0; // 0 = intro, 1..20 = questions, 21 = lead capture, 22 = report
  const answers = {}; // questionId -> optionIndex
  let leadInfo = { name: '', email: '', company: '' };

  const overlay = document.getElementById('diag-overlay');
  const body = document.getElementById('diag-body');
  const footer = document.getElementById('diag-footer');
  const progressFill = document.getElementById('diag-progress-fill');
  const progressLabel = document.getElementById('diag-progress-label');
  const closeBtn = document.getElementById('diag-close');
  const openBtn = document.getElementById('open-diagnostics');

  function totalSteps() { return TOTAL_QUESTIONS + 2; } // intro + 20 q + lead capture; report is final state

  function open() {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    currentStep = 0;
    render();
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(); });

  function updateProgress() {
    let pct = 0;
    let label = '';
    if (currentStep === 0) { pct = 0; label = 'Getting started'; }
    else if (currentStep <= TOTAL_QUESTIONS) { pct = (currentStep / (TOTAL_QUESTIONS + 1)) * 100; label = `Question ${currentStep} / ${TOTAL_QUESTIONS}`; }
    else if (currentStep === TOTAL_QUESTIONS + 1) { pct = (TOTAL_QUESTIONS / (TOTAL_QUESTIONS + 1)) * 100; label = 'Almost done'; }
    else { pct = 100; label = 'Your report'; }
    progressFill.style.width = pct + '%';
    progressLabel.textContent = label;
  }

  function render() {
    updateProgress();
    footer.innerHTML = '';

    if (currentStep === 0) return renderIntro();
    if (currentStep <= TOTAL_QUESTIONS) return renderQuestion(currentStep - 1);
    if (currentStep === TOTAL_QUESTIONS + 1) return renderLeadCapture();
    return renderReport();
  }

  function renderIntro() {
    body.innerHTML = `
      <div class="diag-intro">
        <div class="icon-ring"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg></div>
        <h3>Cintexa Business Health Check</h3>
        <p>Answer 20 quick questions across four categories. You'll get a scored report with specific, prioritized recommendations — no obligation.</p>
        <div class="diag-intro-meta">
          <span>⏱ ~5 minutes</span>
          <span>❓ 20 questions</span>
          <span>📊 Instant report</span>
        </div>
      </div>`;
    footer.innerHTML = `<span></span><button class="btn btn-primary" id="diag-start">Begin assessment</button>`;
    document.getElementById('diag-start').addEventListener('click', () => { currentStep = 1; render(); });
  }

  function renderQuestion(index) {
    const question = QUESTIONS[index];
    const selected = answers[question.id];
    body.innerHTML = `
      <div class="diag-question">
        <span class="diag-category-label">${CATEGORIES[question.cat].label}</span>
        <h3>${question.q}</h3>
        <div class="diag-options" role="radiogroup" aria-label="${question.q}">
          ${question.opts.map((opt, i) => `
            <button class="diag-option${selected === i ? ' is-selected' : ''}" type="button" role="radio" aria-checked="${selected === i}" data-index="${i}">
              <span class="diag-option-radio"></span>
              <span class="diag-option-text">${opt}</span>
            </button>`).join('')}
        </div>
      </div>`;

    body.querySelectorAll('.diag-option').forEach(btn => {
      btn.addEventListener('click', () => {
        answers[question.id] = parseInt(btn.getAttribute('data-index'), 10);
        renderQuestion(index);
      });
    });

    footer.innerHTML = `
      <button class="btn btn-ghost" id="diag-back">${index === 0 ? 'Cancel' : 'Back'}</button>
      <button class="btn btn-primary" id="diag-next" ${selected === undefined ? 'disabled' : ''}>${index === TOTAL_QUESTIONS - 1 ? 'Get my report' : 'Next'}</button>`;

    document.getElementById('diag-back').addEventListener('click', () => {
      if (index === 0) { close(); } else { currentStep -= 1; render(); }
    });
    document.getElementById('diag-next').addEventListener('click', () => {
      currentStep += 1;
      render();
    });
  }

  function renderLeadCapture() {
    body.innerHTML = `
      <div class="diag-intro" style="padding-top:0;">
        <h3 style="margin-bottom:var(--space-2);">Where should we send your report?</h3>
        <p style="margin-bottom:var(--space-5);">Your score and recommendations are ready. Tell us where to send a copy.</p>
      </div>
      <form class="diag-lead-form" id="diag-lead-form">
        <div class="form-field"><label for="diag-name">Full name</label><input type="text" id="diag-name" required value="${leadInfo.name}"></div>
        <div class="form-field"><label for="diag-email">Email address</label><input type="email" id="diag-email" required value="${leadInfo.email}"></div>
        <div class="form-field"><label for="diag-company">Company (optional)</label><input type="text" id="diag-company" value="${leadInfo.company}"></div>
      </form>`;
    footer.innerHTML = `<button class="btn btn-ghost" id="diag-back">Back</button><button class="btn btn-primary" id="diag-finish">View my report</button>`;

    document.getElementById('diag-back').addEventListener('click', () => { currentStep -= 1; render(); });
    document.getElementById('diag-finish').addEventListener('click', () => {
      const name = document.getElementById('diag-name').value.trim();
      const email = document.getElementById('diag-email').value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || !emailPattern.test(email)) {
        document.getElementById('diag-name').style.borderColor = !name ? 'var(--danger)' : '';
        document.getElementById('diag-email').style.borderColor = !emailPattern.test(email) ? 'var(--danger)' : '';
        return;
      }
      leadInfo = { name, email, company: document.getElementById('diag-company').value.trim() };
      currentStep += 1;
      render();
    });
  }

  function computeScores() {
    const catTotals = {}; // cat -> { earned, possible }
    Object.keys(CATEGORIES).forEach(c => { catTotals[c] = { earned: 0, possible: 0 }; });

    QUESTIONS.forEach(q => {
      const val = answers[q.id] ?? 0;
      catTotals[q.cat].earned += val;
      catTotals[q.cat].possible += MAX_PER_Q;
    });

    const catScores = {};
    Object.keys(catTotals).forEach(c => {
      catScores[c] = Math.round((catTotals[c].earned / catTotals[c].possible) * 100);
    });

    const overall = Math.round(
      Object.values(catScores).reduce((sum, s) => sum + s, 0) / Object.keys(catScores).length
    );

    return { catScores, overall };
  }

  function tierFor(score) {
    if (score >= 85) return { label: 'Connected', color: '#2BD9A0' };
    if (score >= 65) return { label: 'Developing', color: '#19D3FF' };
    if (score >= 40) return { label: 'Fragmented', color: '#FFB020' };
    return { label: 'At Risk', color: '#FF5470' };
  }

  function buildRecommendations(catScores) {
    const ranked = Object.entries(catScores).sort((a, b) => a[1] - b[1]); // lowest first
    const recs = [];
    ranked.slice(0, 3).forEach(([cat, score]) => {
      const lib = RECOMMENDATIONS[cat];
      const bucket = score < 50 ? lib.low : lib.mid;
      recs.push({ cat, score, ...bucket });
    });
    return recs;
  }

  function renderReport() {
    const { catScores, overall } = computeScores();
    const tier = tierFor(overall);
    const recs = buildRecommendations(catScores);

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (overall / 100) * circumference;

    body.innerHTML = `
      <div class="diag-report-score">
        <div class="score-ring-wrap">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1E6BFF"/>
                <stop offset="100%" stop-color="#19D3FF"/>
              </linearGradient>
            </defs>
            <circle class="score-ring-track" cx="70" cy="70" r="60" fill="none" stroke-width="10"/>
            <circle class="score-ring-fill" cx="70" cy="70" r="60" fill="none" stroke-width="10"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-ring-value"><span class="num">${overall}</span><span class="denom">/ 100</span></div>
        </div>
        <span class="diag-report-tier" style="color:${tier.color}; border-color:${tier.color}66;">${tier.label}</span>
        <p style="color:var(--text-secondary); text-align:center; font-size:var(--fs-body-sm); max-width:420px;">
          Thanks, ${leadInfo.name.split(' ')[0]} — here's your Business Health Check report based on your answers.
        </p>
      </div>

      <div class="diag-category-bars">
        ${Object.entries(catScores).map(([cat, score]) => `
          <div>
            <div class="diag-category-bar-head">
              <span>${CATEGORIES[cat].label}</span>
              <span class="cat-score">${score}/100</span>
            </div>
            <div class="diag-category-bar-track">
              <div class="diag-category-bar-fill" style="width:${score}%; background:${CATEGORIES[cat].color};"></div>
            </div>
          </div>`).join('')}
      </div>

      <h4 class="diag-category-label" style="margin-bottom:var(--space-4);">Recommended next steps</h4>
      <div class="diag-recommendations">
        ${recs.map(r => `
          <div class="diag-rec-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
            <div><h4>${r.h}</h4><p>${r.p}</p></div>
          </div>`).join('')}
      </div>`;

    footer.innerHTML = `
      <button class="btn btn-ghost" id="diag-retake">Retake</button>
      <a href="#contact" class="btn btn-primary" id="diag-cta">Discuss my results</a>`;

    document.getElementById('diag-retake').addEventListener('click', () => {
      currentStep = 0;
      Object.keys(answers).forEach(k => delete answers[k]);
      render();
    });
    document.getElementById('diag-cta').addEventListener('click', () => {
      close();
    });
  }
})();
