/**
 * Cintexa Portal — Authentication Service
 * ---------------------------------------------------------------------------
 * Secure email/password auth using Firebase Authentication.
 * Handles sign-up, sign-in, password reset, email verification, session state.
 * All protected routes must call requireAuth() before rendering sensitive data.
 */
(function () {
  'use strict';

  var auth = null;
  var currentUser = null;
  var listeners = [];

  function init() {
    if (!window.firebase || !window.CINTEXA_FIREBASE) {
      console.warn('Cintexa Auth: Firebase SDK or config missing. Auth disabled.');
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(window.CINTEXA_FIREBASE);
    }
    auth = firebase.auth();
    auth.onAuthStateChanged(function (user) {
      currentUser = user;
      listeners.forEach(function (cb) { try { cb(user); } catch (e) {} });
    });
  }

  function onAuthChange(cb) {
    listeners.push(cb);
    if (currentUser !== undefined) cb(currentUser);
    return function () {
      listeners = listeners.filter(function (l) { return l !== cb; });
    };
  }

  function requireAuth() {
    return new Promise(function (resolve, reject) {
      if (currentUser) return resolve(currentUser);
      var unsub = onAuthChange(function (user) {
        unsub();
        if (user) resolve(user);
        else reject(new Error('AUTH_REQUIRED'));
      });
    });
  }

  function signUp(data) {
    if (!auth) return Promise.reject(new Error('Auth not initialised'));
    var email = String(data.email || '').trim().toLowerCase();
    var password = String(data.password || '');
    if (!email || !password) return Promise.reject(new Error('Email and password are required'));
    if (password.length < 8) return Promise.reject(new Error('Password must be at least 8 characters'));

    return auth.createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        var profile = {
          uid: cred.user.uid,
          firstName: String(data.firstName || '').trim().slice(0, 80),
          lastName: String(data.lastName || '').trim().slice(0, 80),
          email: email,
          phone: String(data.phone || '').trim().slice(0, 30),
          username: String(data.username || '').trim().slice(0, 40) || null,
          memberSince: firebase.firestore.FieldValue.serverTimestamp(),
          accountStatus: 'active',
          role: 'user',
          emailVerified: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return firebase.firestore().collection('users').doc(cred.user.uid).set(profile)
          .then(function () {
            return cred.user.sendEmailVerification();
          })
          .then(function () { return cred.user; });
      });
  }

  function signIn(email, password, remember) {
    if (!auth) return Promise.reject(new Error('Auth not initialised'));
    var persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    return auth.setPersistence(persistence)
      .then(function () {
        return auth.signInWithEmailAndPassword(String(email).trim().toLowerCase(), password);
      })
      .then(function (cred) { return cred.user; });
  }

  function signOut() {
    if (!auth) return Promise.resolve();
    return auth.signOut();
  }

  function resetPassword(email) {
    if (!auth) return Promise.reject(new Error('Auth not initialised'));
    return auth.sendPasswordResetEmail(String(email).trim().toLowerCase());
  }

  function changePassword(newPassword) {
    if (!auth || !auth.currentUser) return Promise.reject(new Error('Not signed in'));
    return auth.currentUser.updatePassword(newPassword);
  }

  function getCurrentUser() {
    return currentUser;
  }

  window.CintexaAuth = {
    init: init,
    onAuthChange: onAuthChange,
    requireAuth: requireAuth,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: resetPassword,
    changePassword: changePassword,
    getCurrentUser: getCurrentUser
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
