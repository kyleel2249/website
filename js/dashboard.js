/**
 * Cintexa Portal — Dashboard Controller
 * ---------------------------------------------------------------------------
 * Loads authenticated user data, contribution totals, monthly progress,
 * and leaderboard snapshot. Drives the 3D contribution core.
 * Never displays fabricated figures.
 */
(function () {
  'use strict';

  var loadingEl = document.getElementById('dashboard-loading');
  var errorEl = document.getElementById('dashboard-error');
  var contentEl = document.getElementById('dashboard-content');
  var currentUid = null;

  function showLoading() {
    if (loadingEl) loadingEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    if (contentEl) contentEl.hidden = true;
  }
  function showError() {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
  }
  function showContent() {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (contentEl) contentEl.hidden = false;
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function loadDashboard() {
    showLoading();
    window.CintexaAuth.requireAuth()
      .then(function (user) {
        currentUid = user.uid;
        return Promise.all([
          window.CintexaContributions.getUserProfile(user.uid),
          window.CintexaContributions.getUserContributions(user.uid),
          window.CintexaContributions.getMonthlySummary(user.uid, new Date().getFullYear(), new Date().getMonth() + 1),
          window.CintexaContributions.getCurrentUserRank(user.uid, 'this_month'),
          window.CintexaContributions.getLeaderboard('this_month')
        ]);
      })
      .then(function (results) {
        var profile = results[0] || {};
        var contributions = results[1] || [];
        var monthly = results[2] || {};
        var myRank = results[3];
        var leaderboard = results[4] || [];

        setText('greeting', greeting() + ',');
        setText('user-name', (profile.firstName || 'Member') + (profile.lastName ? ' ' + profile.lastName : ''));
        setText('period-label', new Date().toLocaleString('en-GH', { month: 'long', year: 'numeric' }));

        var initials = ((profile.firstName || 'M')[0] + (profile.lastName || '')[0]).toUpperCase();
        setText('avatar-initials', initials);

        var totals = window.CintexaContributions.calculateTotals(contributions);
        setText('kpi-total', window.CintexaContributions.formatCurrency(totals.confirmed));
        setText('kpi-total-meta', totals.count + ' contribution' + (totals.count === 1 ? '' : 's'));

        setText('kpi-month', window.CintexaContributions.formatCurrency(monthly.contributed || 0));
        setText('kpi-month-meta', monthly.status || '—');

        setText('kpi-progress', (monthly.progress || 0) + '%');
        setText('kpi-progress-meta', 'of monthly target');

        setText('kpi-rank', myRank ? '#' + myRank.rank : '—');
        setText('kpi-rank-meta', myRank ? 'this month' : 'Not ranked yet');

        setText('stat-target', window.CintexaContributions.formatCurrency(monthly.target || 0));
        setText('stat-contributed', window.CintexaContributions.formatCurrency(monthly.contributed || 0));
        setText('stat-remaining', window.CintexaContributions.formatCurrency(monthly.remaining || 0));
        setText('core-pct', (monthly.progress || 0) + '%');

        if (window.CintexaContributionCore) {
          window.CintexaContributionCore.setProgress(monthly.progress || 0);
        }

        var recent = contributions.filter(function (c) { return c.status === 'confirmed'; }).slice(0, 5);
        var recentList = document.getElementById('recent-list');
        if (recentList) {
          if (recent.length === 0) {
            recentList.innerHTML = '<p class="empty-state">No contribution records yet. Your journey starts here.</p>';
          } else {
            recentList.innerHTML = recent.map(function (c) {
              var date = c.contributionDate ? new Date(c.contributionDate.seconds ? c.contributionDate.seconds * 1000 : c.contributionDate) : null;
              var dateStr = date ? date.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
              return '<div class="recent-item">' +
                '<div class="recent-date">' + dateStr + '</div>' +
                '<div class="recent-amount">' + window.CintexaContributions.formatCurrency(c.amount) + '</div>' +
                '<div class="recent-cat">' + (c.category || 'Contribution') + '</div>' +
                '</div>';
            }).join('');
          }
        }

        var lbEl = document.getElementById('leaderboard-snapshot');
        if (lbEl) {
          if (leaderboard.length === 0) {
            lbEl.innerHTML = '<p class="empty-state">Leaderboard data is not available yet.</p>';
          } else {
            lbEl.innerHTML = leaderboard.slice(0, 5).map(function (row) {
              var isMe = row.userId === currentUid;
              return '<div class="lb-row' + (isMe ? ' is-me' : '') + '">' +
                '<span class="lb-rank">#' + row.rank + '</span>' +
                '<span class="lb-name">' + (isMe ? 'You' : (row.displayName || 'Member')) + '</span>' +
                '<span class="lb-amount">' + window.CintexaContributions.formatCurrency(row.monthlyContribution) + '</span>' +
                '</div>';
            }).join('');
          }
        }

        showContent();
      })
      .catch(function (err) {
        if (err && err.message === 'AUTH_REQUIRED') {
          location.replace('/portal/sign-in.html');
          return;
        }
        console.error('Dashboard load error:', err);
        showError();
      });
  }

  var signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function () {
      window.CintexaAuth.signOut().then(function () {
        location.replace('/portal/sign-in.html');
      });
    });
  }

  var refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);
  var retryBtn = document.getElementById('retry-btn');
  if (retryBtn) retryBtn.addEventListener('click', loadDashboard);

  var navToggle = document.getElementById('nav-toggle');
  var sidebar = document.getElementById('portal-sidebar');
  if (navToggle && sidebar) {
    navToggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDashboard);
  } else {
    loadDashboard();
  }
})();
