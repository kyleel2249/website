/**
 * Cintexa Portal — Contribution Service
 * ---------------------------------------------------------------------------
 * All contribution data is read from Firestore.
 * Users can ONLY read their own records.
 * Creation / modification is restricted to admin / Cloud Functions.
 * Never trust client-side totals for security-sensitive decisions.
 */
(function () {
  'use strict';

  function db() {
    return firebase.firestore();
  }

  function formatCurrency(amount, currency) {
    var cfg = window.CINTEXA_CONFIG || { currency: 'GHS', numberLocale: 'en-GH' };
    var value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(cfg.numberLocale || 'en-GH', {
        style: 'currency',
        currency: currency || cfg.currency || 'GHS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (e) {
      return (currency || cfg.currency || 'GHS') + ' ' + value.toFixed(2);
    }
  }

  function getUserProfile(uid) {
    return db().collection('users').doc(uid).get()
      .then(function (snap) {
        if (!snap.exists) return null;
        return Object.assign({ uid: uid }, snap.data());
      });
  }

  function getUserContributions(uid, filters) {
    filters = filters || {};
    var q = db().collection('contributions')
      .where('userId', '==', uid)
      .orderBy('contributionDate', 'desc');

    return q.get().then(function (snap) {
      var items = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        d.id = doc.id;
        if (filters.status && d.status !== filters.status) return;
        if (filters.year && d.contributionYear !== filters.year) return;
        if (filters.month && d.contributionMonth !== filters.month) return;
        items.push(d);
      });
      return items;
    });
  }

  function calculateTotals(contributions) {
    var total = 0;
    var confirmed = 0;
    var byMonth = {};
    contributions.forEach(function (c) {
      var amount = Number(c.amount) || 0;
      total += amount;
      if (c.status === 'confirmed') confirmed += amount;
      var key = (c.contributionYear || 0) + '-' + String(c.contributionMonth || 0).padStart(2, '0');
      if (!byMonth[key]) byMonth[key] = { amount: 0, count: 0, year: c.contributionYear, month: c.contributionMonth };
      byMonth[key].amount += amount;
      byMonth[key].count += 1;
    });
    return {
      total: total,
      confirmed: confirmed,
      count: contributions.length,
      byMonth: byMonth
    };
  }

  function getMonthlySummary(uid, year, month) {
    return getUserContributions(uid, { year: year, month: month })
      .then(function (items) {
        var totals = calculateTotals(items);
        return db().collection('monthlyTargets').doc(uid + '_' + year + '_' + month).get()
          .then(function (snap) {
            var target = snap.exists ? Number(snap.data().target) : (window.CINTEXA_CONFIG && window.CINTEXA_CONFIG.defaultMonthlyTarget) || 1000;
            var contributed = totals.confirmed;
            var remaining = Math.max(0, target - contributed);
            var progress = target > 0 ? Math.min(100, Math.round((contributed / target) * 1000) / 10) : 0;
            return {
              year: year,
              month: month,
              target: target,
              contributed: contributed,
              remaining: remaining,
              progress: progress,
              count: totals.count,
              status: progress >= 100 ? 'complete' : (progress >= 75 ? 'on-track' : 'in-progress')
            };
          });
      });
  }

  function getLeaderboard(period) {
    var col = db().collection('leaderboard');
    var q = col.where('period', '==', period || 'this_month').orderBy('rank', 'asc').limit(50);
    return q.get().then(function (snap) {
      var rows = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        d.id = doc.id;
        rows.push({
          rank: d.rank,
          displayName: d.displayName || 'Member',
          username: d.username || null,
          monthlyContribution: Number(d.monthlyContribution) || 0,
          totalContribution: Number(d.totalContribution) || 0,
          userId: d.userId
        });
      });
      return rows;
    });
  }

  function getCurrentUserRank(uid, period) {
    return getLeaderboard(period).then(function (rows) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].userId === uid) return rows[i];
      }
      return null;
    });
  }

  window.CintexaContributions = {
    formatCurrency: formatCurrency,
    getUserProfile: getUserProfile,
    getUserContributions: getUserContributions,
    calculateTotals: calculateTotals,
    getMonthlySummary: getMonthlySummary,
    getLeaderboard: getLeaderboard,
    getCurrentUserRank: getCurrentUserRank
  };
})();
