# Cintexa Member Portal & Contribution Dashboard

Production-ready authenticated member area for the Cintexa website.

## What is included

- **Authentication**: Sign-up, Sign-in, Password reset, Email verification (Firebase Auth)
- **Protected Dashboard**: Total contribution, This month, Progress %, Rank
- **3D Contribution Core**: Adaptive progress ring driven by real data
- **Contribution History**: List with filtering support
- **Leaderboard**: Ranked view with privacy controls
- **Profile & Settings**: Account management + Reduce Motion toggle
- **Security model**: Users can only read their own records; financial writes are admin-only

## Architecture

```
portal/
  sign-in.html
  sign-up.html
  forgot-password.html
  dashboard.html

js/
  firebase-config.js         ← replace with real Firebase web config
  auth-service.js
  contribution-service.js
  portal-auth-ui.js
  dashboard.js
  contribution-core-3d.js

css/
  portal.css
```

## Setup steps (required for production)

1. **Enable Firebase Auth + Firestore** in the `cintexa-platform` project.
2. Replace the placeholder values in `js/firebase-config.js` with the real web config from the Firebase console.
3. Deploy the Firestore security rules (see below).
4. Create the collections: `users`, `contributions`, `monthlyTargets`, `leaderboard`, `notifications`.
5. The portal files are already under `/portal/` and supporting JS/CSS.
6. Add Member Portal links to the main site footer.

## Firestore Security Rules (deploy these)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /contributions/{id} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    match /monthlyTargets/{id} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
    match /leaderboard/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /notifications/{id} {
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

## Data model

**users/{uid}** — firstName, lastName, email, phone, username, memberSince, accountStatus, role, emailVerified

**contributions/{id}** — userId, amount, currency, contributionDate, contributionMonth, contributionYear, category, status, reference

**monthlyTargets/{uid_year_month}** — userId, year, month, target

**leaderboard/{id}** — period, rank, userId, displayName, username, monthlyContribution, totalContribution

## Business rules enforced

- No investment returns or fabricated balances.
- All displayed figures come from Firestore records.
- Users cannot modify contribution amounts, dates, or status.
- Progress % is calculated from confirmed contributions vs configured target.
- Leaderboard ranking is server-side / admin-controlled.
- Reduced-motion preference is respected.

## Footer addition (main site)

```html
<div class="footer-col">
  <h4>Member Portal</h4>
  <ul>
    <li><a href="/portal/sign-in.html">Sign In</a></li>
    <li><a href="/portal/sign-up.html">Create Account</a></li>
    <li><a href="/portal/dashboard.html">Member Dashboard</a></li>
  </ul>
  <a href="/portal/sign-in.html" class="btn btn-primary btn-sm">Member Login →</a>
</div>
```
