/**
 * Cintexa Portal — Auth UI helpers (sign-in / sign-up / forgot)
 */
(function () {
  'use strict';

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-target');
      var input = document.getElementById(id);
      if (!input) return;
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.textContent = isPass ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
    });
  });

  var signInForm = document.getElementById('auth-form');
  if (signInForm && location.pathname.indexOf('sign-in') !== -1) {
    var errEl = document.getElementById('auth-error');
    var submitBtn = document.getElementById('submit-btn');

    if (window.CintexaAuth) {
      window.CintexaAuth.onAuthChange(function (user) {
        if (user) location.replace('/portal/dashboard.html');
      });
    }

    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(errEl);
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;
      var remember = document.getElementById('remember').checked;

      if (!email || !password) {
        showError(errEl, 'Please enter your email and password.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      window.CintexaAuth.signIn(email, password, remember)
        .then(function () {
          location.replace('/portal/dashboard.html');
        })
        .catch(function (err) {
          var msg = 'Unable to sign in. Please check your credentials.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = 'Invalid email or password.';
          } else if (err.code === 'auth/too-many-requests') {
            msg = 'Too many attempts. Please try again later.';
          }
          showError(errEl, msg);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        });
    });
  }

  var signUpForm = document.getElementById('signup-form');
  if (signUpForm) {
    var errEl2 = document.getElementById('auth-error');
    var submitBtn2 = document.getElementById('submit-btn');

    signUpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(errEl2);

      var firstName = document.getElementById('firstName').value.trim();
      var lastName = document.getElementById('lastName').value.trim();
      var email = document.getElementById('email').value.trim();
      var phone = document.getElementById('phone').value.trim();
      var password = document.getElementById('password').value;
      var confirm = document.getElementById('confirmPassword').value;
      var terms = document.getElementById('terms').checked;

      if (!firstName || !lastName || !email || !password) {
        showError(errEl2, 'Please fill in all required fields.');
        return;
      }
      if (password.length < 8) {
        showError(errEl2, 'Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        showError(errEl2, 'Passwords do not match.');
        return;
      }
      if (!terms) {
        showError(errEl2, 'You must accept the Terms and Privacy Policy.');
        return;
      }

      submitBtn2.disabled = true;
      submitBtn2.textContent = 'Creating account…';

      window.CintexaAuth.signUp({
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        password: password
      })
        .then(function () {
          location.replace('/portal/verify-email.html');
        })
        .catch(function (err) {
          var msg = 'Unable to create account. Please try again.';
          if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists.';
          else if (err.code === 'auth/weak-password') msg = 'Password is too weak.';
          else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
          showError(errEl2, msg);
          submitBtn2.disabled = false;
          submitBtn2.textContent = 'Create Account';
        });
    });
  }

  var forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    var errEl3 = document.getElementById('auth-error');
    var successEl = document.getElementById('auth-success');
    var submitBtn3 = document.getElementById('submit-btn');

    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(errEl3);
      if (successEl) successEl.hidden = true;

      var email = document.getElementById('email').value.trim();
      if (!email) {
        showError(errEl3, 'Please enter your email address.');
        return;
      }

      submitBtn3.disabled = true;
      submitBtn3.textContent = 'Sending…';

      window.CintexaAuth.resetPassword(email)
        .then(function () {
          if (successEl) {
            successEl.textContent = 'If an account exists for that email, a reset link has been sent.';
            successEl.hidden = false;
          }
          submitBtn3.disabled = false;
          submitBtn3.textContent = 'Send Reset Link';
        })
        .catch(function () {
          if (successEl) {
            successEl.textContent = 'If an account exists for that email, a reset link has been sent.';
            successEl.hidden = false;
          }
          submitBtn3.disabled = false;
          submitBtn3.textContent = 'Send Reset Link';
        });
    });
  }
})();
