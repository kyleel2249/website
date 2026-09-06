/**
 * Cintexa Portal — Firebase Configuration
 * ---------------------------------------------------------------------------
 * Uses the existing cintexa-platform Firebase project.
 * Replace the placeholder values with the real config from the Firebase console
 * (Project Settings → General → Your apps).
 *
 * Security: never commit real private keys. Only the public web config goes here.
 */
(function () {
  'use strict';

  // TODO: Replace with real values from Firebase Console → Project Settings
  // These are public client-side keys (safe to expose) once Auth + Firestore are enabled.
  window.CINTEXA_FIREBASE = {
    apiKey: "AIzaSyDummy-ReplaceWithRealKey",
    authDomain: "cintexa-platform.firebaseapp.com",
    projectId: "cintexa-platform",
    storageBucket: "cintexa-platform.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:abcdef"
  };

  // Currency & contribution defaults (admin-configurable later)
  window.CINTEXA_CONFIG = {
    currency: "GHS",
    currencySymbol: "GHS",
    defaultMonthlyTarget: 1000,
    dateLocale: "en-GH",
    numberLocale: "en-GH"
  };
})();
