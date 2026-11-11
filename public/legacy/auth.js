/* TGNE Solutions — workspace authentication and role-based access */
'use strict';

const Auth = (function () {
  const LEGACY_SESSION_KEY = 'landledger.session.v1';
  const REMEMBER_EMAIL_KEY = 'landledger.login.email.v1';
  const ADMIN_ROLE_KEYS = ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST'];
  let user = null;
  let callbacks = {};
  let signingIn = false;
  let demoQuickLogin = false;

  const DEMO_ROLES = [
    { role: 'SUPER_ADMIN', label: 'Admin', hint: 'Full workspace' },
    { role: 'OFFICE_MANAGER', label: 'Office manager', hint: 'Operations' },
    { role: 'ACCOUNTANT', label: 'Accountant', hint: 'Finance' },
    { role: 'SURVEYOR', label: 'Surveyor', hint: 'Field work' },
    { role: 'RECEPTIONIST', label: 'Receptionist', hint: 'Front desk' },
    { role: 'VISITOR', label: 'Visitor', hint: 'External' },
    { role: 'CLIENT', label: 'Client', hint: 'TGNE services' }
  ];

  function initials(name) {
    const parts = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]).join('').toUpperCase() || '?';
  }

  function applySession(payload) {
    if (!payload) {
      clearUser();
      return null;
    }
    if (typeof payload.demoQuickLogin === 'boolean') demoQuickLogin = payload.demoQuickLogin;
    if (!payload.user) {
      clearUser();
      return null;
    }
    const access = payload.access || {};
    user = {
      id: access.visual || 'viewer',
      roleKey: access.key || '',
      name: payload.user.name || payload.user.email,
      email: payload.user.email,
      label: access.label || 'Member',
      summary: access.summary || '',
      initials: initials(payload.user.name),
      permissions: access.permissions || [],
      officePanels: access.officePanels || []
    };
    document.body.dataset.role = user.id;
    return user;
  }

  async function fetchSession() {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Session request failed');
      const payload = await response.json();
      return applySession(payload);
    } catch {
      clearUser();
      return null;
    }
  }

  function clearUser() {
    user = null;
    document.body.removeAttribute('data-role');
    try { localStorage.removeItem(LEGACY_SESSION_KEY); } catch (err) {}
  }

  async function restore() {
    return fetchSession();
  }

  async function signIn(email, password) {
    if (signingIn) return { error: 'A sign-in is already in progress.' };
    signingIn = true;
    clearUser();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { error: result.error || 'Sign in failed (' + response.status + ').' };
      const restored = await fetchSession();
      if (!restored) return { error: 'Signed in, but your session could not be loaded. Refresh the page.' };
      hideLogin();
      if (callbacks.onLogin) callbacks.onLogin(user);
      return { ok: true };
    } catch (err) {
      return { error: 'Cannot reach the server. Check your connection and try again.' };
    } finally {
      signingIn = false;
    }
  }

  function logout() {
    clearUser();
    showLogin();
    return fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Session invalidation failed (' + response.status + ').');
        if (callbacks.onLogout) callbacks.onLogout();
        return true;
      })
      .catch(function () {
        const error = document.getElementById('loginError');
        if (error) {
          error.textContent = 'Sign out could not be completed. Please try again.';
          error.hidden = false;
        }
        return false;
      });
  }

  function user_() {
    return user;
  }

  function isAuthenticated() {
    return Boolean(user);
  }

  function can(permission) {
    if (!user) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  }

  function canRoute(route) {
    if (!user) return false;
    if (route.indexOf('client-') === 0) {
      const clientPanel = typeof OFFICE_ROUTES !== 'undefined' ? OFFICE_ROUTES[route] : '';
      return Boolean(clientPanel) && user.officePanels.includes(clientPanel);
    }
    if (!ADMIN_ROLE_KEYS.includes(user.roleKey)) return false;
    if (route.indexOf('office-') === 0) {
      const panel = typeof OFFICE_ROUTES !== 'undefined' ? OFFICE_ROUTES[route] : '';
      return Boolean(panel) && user.officePanels.includes(panel);
    }
    if (route === 'settings') return can('settings.view');
    if (route === 'accounting') return can('accounting.view');
    if (route === 'finance' || route.indexOf('finance-') === 0) return can('finance.view');
    if (route === 'staff') return can('staff.view');
    if (route === 'leads') return can('leads.view');
    if (route === 'tasks') return can('tasks.view');
    if (route === 'reports') return can('reports.view');
    if (route === 'documents') return can('estateDocs.view');
    if (route === 'maintenance') return can('maintenance.view');
    if (route === 'complaints') return can('complaints.view');
    if (route === 'sales' || route === 'receipts' || route === 'buyers') {
      return can('sales.create') || can('payments.record') || can('buyers.manage') || can('accounting.view');
    }
    if (route === 'map' || route === 'plots') {
      return can('plots.manage') || can('accounting.view') || can('reports.view');
    }
    return true;
  }

  function init(opts) {
    callbacks = opts || {};
  }

  function rememberedEmail() {
    try { return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''; } catch (err) { return ''; }
  }

  function saveRememberedEmail(email) {
    try {
      if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch (err) { /* Remembering the email is optional. */ }
  }

  function quickLoginHTML() {
    return '<div class="auth-demo" id="loginDemo" hidden>' +
      '<div class="auth-divider"><span>Demo quick sign-in</span></div>' +
      '<div class="auth-demo-grid">' +
        DEMO_ROLES.map(function (entry) {
          const wide = entry.role === 'CLIENT' ? ' is-wide' : '';
          return '<button type="button" class="auth-demo-btn' + wide + '" data-quick-role="' + entry.role + '">' +
            '<strong>' + entry.label + '</strong><small>' + entry.hint + '</small></button>';
        }).join('') +
      '</div>' +
      '<p class="auth-demo-note">Demo accounts only · disabled on production</p>' +
    '</div>';
  }

  function signInCardHTML() {
    return '<div class="login-card-head">' +
        '<p class="auth-kicker">TGNE client portal</p>' +
        '<h2 id="loginCardTitle">Welcome to your workspace</h2>' +
        '<p class="login-sub">Sign in to manage your requests, review project progress and stay connected with the TGNE team.</p>' +
      '</div>' +
      '<form class="auth-form" id="loginForm" novalidate>' +
        '<div class="auth-field">' +
          '<label for="loginEmail">Email address</label>' +
          '<div class="auth-input">' + icon('mail', 16) +
            '<input id="loginEmail" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required maxlength="254" placeholder="you@company.com">' +
          '</div>' +
        '</div>' +
        '<div class="auth-field has-reveal">' +
          '<label for="loginPassword">Password</label>' +
          '<div class="auth-input">' + icon('lock', 16) +
            '<input id="loginPassword" name="password" type="password" autocomplete="current-password" required maxlength="200" placeholder="Enter your password">' +
            '<button type="button" class="auth-reveal" id="loginReveal" aria-label="Show password" aria-pressed="false">' + icon('eye', 16) + '</button>' +
          '</div>' +
        '</div>' +
        '<p class="auth-caps" id="loginCaps" hidden>' + icon('info', 13) + '<span>Caps Lock is on</span></p>' +
        '<div class="auth-row">' +
          '<label class="auth-check"><input type="checkbox" id="loginRemember"><span>Remember my email</span></label>' +
          '<button type="button" class="auth-text-btn" id="loginForgot">Forgot password?</button>' +
        '</div>' +
        '<p class="login-error" id="loginError" role="alert" hidden></p>' +
        '<button type="submit" class="auth-submit" id="loginSubmit">' +
          '<span class="auth-submit-label">Sign in</span>' + icon('arrowRight', 16) +
          '<span class="auth-submit-spinner" aria-hidden="true"></span>' +
        '</button>' +
      '</form>' +
      quickLoginHTML() +
      '<div class="auth-divider"><span>Need access?</span></div>' +
      '<p class="auth-help">Need client access? <a href="/contact">Contact the TGNE team</a> to get started.</p>' +
      '<p class="auth-security">' + icon('shield', 14) + '<span>TGNE Solutions · Secure client access</span></p>';
  }

  function resetCardHTML() {
    return '<button type="button" class="auth-back" id="loginBack">' + icon('chevronLeft', 15) + '<span>Back to sign in</span></button>' +
      '<div class="login-card-head">' +
        '<p class="auth-kicker">Account help</p>' +
        '<h2>Reset your password</h2>' +
        '<p class="login-sub">For a password reset, contact the TGNE team. We will verify your account before restoring access.</p>' +
      '</div>' +
      '<ol class="auth-steps">' +
        '<li><span class="step-no">1</span><div><strong>Contact TGNE</strong><small>Use the contact page, call your account manager, or visit the office in person.</small></div></li>' +
        '<li><span class="step-no">2</span><div><strong>Confirm your identity</strong><small>The TGNE team verifies your details before restoring access.</small></div></li>' +
        '<li><span class="step-no">3</span><div><strong>Sign in again</strong><small>Use the new password on this page. Your access follows the same role.</small></div></li>' +
      '</ol>' +
      '<a class="auth-submit auth-submit-link" href="/contact"><span>Contact TGNE</span>' + icon('arrowRight', 16) + '</a>' +
      '<p class="auth-security">' + icon('key', 14) + '<span>Never share your password by email or WhatsApp</span></p>';
  }

  function loginScreenHTML() {
    return '<main class="login-screen" id="loginScreen">' +
      '<section class="login-brand" aria-label="TGNE Solutions client workspace">' +
        '<div class="login-brand-top">' +
          '<img class="login-logo" src="/assets/tgne-logo.png" alt="TGNE Solutions logo">' +
          '<span class="login-wordmark"><strong>TGNE Solutions</strong><small>Technology · Design · Education</small></span>' +
        '</div>' +
        '<div class="login-hero">' +
          '<span class="login-eyebrow">Your client workspace</span>' +
          '<h1>Your work, clearly in view.</h1>' +
          '<p>Track service requests, project updates, documents and payments in one secure place.</p>' +
        '</div>' +
        '<div class="login-points">' +
          '<div class="login-point"><span>' + icon('refresh', 17) + '</span><div><strong>Requests from start to finish</strong><small>Follow your work from submission through delivery.</small></div></div>' +
          '<div class="login-point"><span>' + icon('file', 17) + '</span><div><strong>Updates and documents together</strong><small>Keep project information close at hand.</small></div></div>' +
          '<div class="login-point"><span>' + icon('shield', 17) + '</span><div><strong>A team working with you</strong><small>Stay in touch with TGNE at every stage.</small></div></div>' +
        '</div>' +
        '<div class="login-brand-foot"><span class="dot-online"></span> TGNE Solutions · Secure client workspace</div>' +
      '</section>' +
      '<section class="login-panel" aria-labelledby="loginCardTitle">' +
        '<div class="login-card" id="loginCard">' + signInCardHTML() + '</div>' +
      '</section>' +
    '</main>';
  }

  function showForgotView() {
    const card = document.getElementById('loginCard');
    if (!card) return;
    card.innerHTML = resetCardHTML();
    document.title = 'Reset access — TGNE Solutions';
    const back = card.querySelector('#loginBack');
    if (back) back.addEventListener('click', showLogin);
    const heading = card.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      try { heading.focus(); } catch (err) { /* Focus is a convenience. */ }
    }
  }

  function bindSignIn(root) {
    const form = root.querySelector('#loginForm');
    if (!form) return;
    form.addEventListener('submit', submitLogin);

    const password = form.elements.password;
    const reveal = root.querySelector('#loginReveal');
    if (reveal && password) {
      reveal.addEventListener('click', function () {
        const showing = password.type === 'text';
        password.type = showing ? 'password' : 'text';
        reveal.setAttribute('aria-pressed', showing ? 'false' : 'true');
        reveal.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        reveal.innerHTML = icon(showing ? 'eye' : 'eyeOff', 16);
        try { password.focus(); } catch (err) { /* Focus is a convenience. */ }
      });
    }

    const caps = root.querySelector('#loginCaps');
    function syncCaps(event) {
      if (!caps) return;
      const on = Boolean(event.getModifierState && event.getModifierState('CapsLock'));
      caps.hidden = !on;
    }
    if (password) {
      password.addEventListener('keydown', syncCaps);
      password.addEventListener('keyup', syncCaps);
      password.addEventListener('blur', function () { if (caps) caps.hidden = true; });
    }

    const forgot = root.querySelector('#loginForgot');
    if (forgot) forgot.addEventListener('click', showForgotView);

    root.querySelectorAll('[data-quick-role]').forEach(function (button) {
      button.addEventListener('click', function () {
        quickSignIn(button.getAttribute('data-quick-role'), button);
      });
    });
  }

  async function quickSignIn(role, button) {
    clearUser();
    const error = document.getElementById('loginError');
    const buttons = document.querySelectorAll('[data-quick-role]');
    function showError(message) {
      if (!error) return;
      error.textContent = message;
      error.hidden = false;
    }
    if (!role) return { error: 'Unknown demo role.' };
    if (error) error.hidden = true;
    buttons.forEach(function (entry) { entry.disabled = true; });
    if (button) button.classList.add('is-loading');
    try {
      const response = await fetch('/api/auth/quick-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: role })
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        showError(result.error || 'Quick sign-in failed (' + response.status + ').');
        return { error: result.error || 'Quick sign-in failed.' };
      }
      const restored = await fetchSession();
      if (!restored) {
        showError('Signed in, but your session could not be loaded. Refresh the page.');
        return { error: 'Session could not be loaded.' };
      }
      hideLogin();
      if (callbacks.onLogin) callbacks.onLogin(user);
      return { ok: true };
    } catch (err) {
      showError('Cannot reach the server. Check your connection and try again.');
      return { error: 'Network error.' };
    } finally {
      buttons.forEach(function (entry) { entry.disabled = false; });
      if (button) button.classList.remove('is-loading');
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(form.elements.email.value || '').trim();
    const password = String(form.elements.password.value || '');
    const remember = form.querySelector('#loginRemember');
    const error = document.getElementById('loginError');
    const button = form.querySelector('#loginSubmit');
    const label = button ? button.querySelector('.auth-submit-label') : null;

    function showError(message) {
      if (!error) return;
      error.textContent = message;
      error.hidden = false;
    }

    if (!email || !password) {
      showError('Enter your email address and password.');
      return;
    }
    if (error) error.hidden = true;
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
      if (label) label.textContent = 'Signing in…';
    }
    const result = await signIn(email, password);
    if (!result.ok) {
      if (button) {
        button.disabled = false;
        button.classList.remove('is-loading');
        if (label) label.textContent = 'Sign in';
      }
      showError(result.error);
      return;
    }
    saveRememberedEmail(remember && remember.checked ? email : '');
  }

  function showLogin() {
    document.body.classList.add('auth-locked');
    document.body.removeAttribute('data-role');
    const root = document.getElementById('loginRoot');
    if (!root) return;
    root.innerHTML = loginScreenHTML();
    document.title = 'Sign in — TGNE Solutions';
    bindSignIn(root);

    const demo = root.querySelector('#loginDemo');
    if (demo) demo.hidden = !demoQuickLogin;

    const email = root.querySelector('#loginEmail');
    const password = root.querySelector('#loginPassword');
    const remember = root.querySelector('#loginRemember');
    const saved = rememberedEmail();
    if (email && saved) {
      email.value = saved;
      if (remember) remember.checked = true;
    }
    setTimeout(function () {
      try { (email && email.value ? password : email).focus(); } catch (err) { /* Focus is a convenience. */ }
    }, 40);
  }

  function showChecking() {
    document.body.classList.add('auth-locked');
    document.body.removeAttribute('data-role');
    const root = document.getElementById('loginRoot');
    if (!root) return;
    root.innerHTML = '<main class="login-screen login-checking"><div class="login-checking-card" role="status"><span class="login-spinner"></span><p>Restoring your session…</p></div></main>';
    document.title = 'Signing in — TGNE Solutions';
  }

  function hideLogin() {
    document.body.classList.remove('auth-locked');
    const root = document.getElementById('loginRoot');
    if (root) root.innerHTML = '';
  }

  return {
    init,
    restore,
    signIn,
    logout,
    showLogin,
    showChecking,
    hideLogin,
    user: user_,
    isAuthenticated,
    can,
    canRoute
  };
})();

function can(permission) {
  return Auth.can(permission);
}

function canRoute(route) {
  return Auth.canRoute(route);
}

function requirePermission(permission) {
  if (can(permission)) return true;
  toast('Your role does not allow that action.', 'warn');
  return false;
}
