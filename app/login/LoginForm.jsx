'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Icon from '../../components/land/icons';
import styles from './login.module.css';

const LOGIN_API = '/api/auth/login';
const SESSION_API = '/api/auth/session';
const REMEMBER_KEY = 'tgne.login.remember';
const DEFAULT_REDIRECT = '/client';

// Only allow relative, same-origin paths. No external URLs, no protocol-relative
// URLs (//evil.com), no javascript: or data: schemes.
function isSafeRedirectPath(path) {
  if (typeof path !== 'string' || !path) return false;
  // Must start with / and not be // (protocol-relative) or /\\ (Windows path).
  return /^\/[^\/\\]/.test(path);
}

export default function LoginForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const formRef = useRef(null);

  // Restore remembered email on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    } catch {
      // localStorage unavailable; ignore.
    }
  }, []);

  // If already authenticated (has a session), redirect away from the login page.
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await fetch(SESSION_API, { credentials: 'same-origin', headers: { 'cache-control': 'no-store' } });
        if (res.ok) {
          const data = await res.json();
          if (data.user && !cancelled) {
            const next = isSafeRedirectPath(DEFAULT_REDIRECT) ? DEFAULT_REDIRECT : '/client';
            router.replace(next);
          }
        }
      } catch {
        // Session endpoint unavailable; allow login form to render.
      }
    }
    checkSession();
    return () => { cancelled = true; };
  }, [pathname, router]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setStatus('submitting');

      const trimmedEmail = email.trim().toLowerCase();
      try {
        const res = await fetch(LOGIN_API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: trimmedEmail, password })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus('error');
          setError(data?.error || 'Email or password is incorrect.');
          return;
        }

        if (remember) {
          try { window.localStorage.setItem(REMEMBER_KEY, trimmedEmail); } catch {}
        } else {
          try { window.localStorage.removeItem(REMEMBER_KEY); } catch {}
        }

        setStatus('ok');
        try {
          const sessionRes = await fetch(SESSION_API, {
            credentials: 'same-origin',
            headers: { 'cache-control': 'no-store' }
          });
          const sessionData = await sessionRes.json().catch(() => ({}));
          const userRoles = sessionData.user?.roles || [];
          const STAFF_ROLES = ['SUPER_ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT', 'SURVEYOR', 'RECEPTIONIST'];
          const isStaff = userRoles.some((r) => STAFF_ROLES.includes(r.key));
          const next = isStaff ? '/dashboard' : '/client';
          router.replace(next);
        } catch {
          // Fall back to default redirect if session fetch fails
          router.replace(DEFAULT_REDIRECT);
        }
      } catch {
        setStatus('error');
        setError('We could not reach the sign-in service. Check your connection and try again.');
      }
    },
    [email, password, remember, router, SESSION_API, DEFAULT_REDIRECT]
  );

  // Show the success state briefly, then redirect (router.replace already called).
  if (status === 'ok') {
    return (
      <div className={styles.loginPage} aria-busy="true">
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>
            <div className={styles.loginMark}>
              <Icon name="shield" size={30} />
            </div>
            <div className={styles.loginBrandName}>TGNE Solutions</div>
            <div className={styles.loginBrandTag}>Secure workspace</div>
          </div>
          <div className={styles.loginHead}>
            <h1>Signing you in…</h1>
            <p>Redirecting to your workspace.</p>
          </div>
          <div className={styles.loginActions}>
            <button className={styles.loginSubmit} disabled>
              <span className={styles.loginSpinner} aria-hidden="true"></span>
              Signing in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginPage} aria-label="TGNE Solutions sign-in">
      <a href="#content" className="sr-only">
        Skip to content
      </a>
      <main id="content" className={styles.loginCard}>
        <div className={styles.loginBrand}>
          <div className={styles.loginMark}>
            <Image src="/icons/icon-512.png" alt="" width={64} height={64} loading="eager" />
          </div>
          <div className={styles.loginBrandName}>TGNE Solutions</div>
          <div className={styles.loginBrandTag}>Technology · Design · ICT</div>
        </div>

        <div className={styles.loginHead}>
          <h1>Client Login</h1>
          <p>Sign in to your TGNE client portal to manage service requests, orders, invoices and team collaboration.</p>
        </div>

        {error ? (
          <div className={styles.loginAlert} role="alert" aria-live="polite">
            <span className={styles.icon} aria-hidden="true">
              <Icon name="close" size={16} />
            </span>
            {error}
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className={styles.loginField}>
            <label htmlFor="login-email"><span className={styles.dot} aria-hidden="true"></span>Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete={remember ? 'email' : 'off'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={`${styles.loginInput} ${error ? styles.loginInputError : ''}`}
              required
            />
          </div>

          <div className={styles.loginField}>
            <label htmlFor="login-password"><span className={styles.dot} aria-hidden="true"></span>Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={remember ? 'current-password' : 'off'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${styles.loginInput} ${error ? styles.loginInputError : ''}`}
              required
            />
          </div>

          <label className={styles.loginRemember}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              aria-label="Remember me on this device"
            />
            Remember me on this device
          </label>

          <div className={styles.loginActions}>
            <button type="submit" className={styles.loginSubmit} disabled={status === 'submitting'}>
              {status === 'submitting' ? (
                <>
                  <span className={styles.loginSpinner} aria-hidden="true"></span>
                  Signing in…
                </>
              ) : (
                <>
                  <Icon name="arrowRight" size={15} />
                  Sign in to workspace
                </>
              )}
            </button>
          </div>

          <div className={styles.loginForgot}>
            <a href="/forgot-password">Forgot password?</a>
          </div>
        </form>

        <div className={styles.loginFooter}>
          New to TGNE?{' '}
          <a href="/contact">Request workspace access</a>
        </div>
        <p className={styles.loginDisclaimer}>
          TGNE Solutions · Technology, design and ICT support in Tema, Ghana.
        </p>
      </main>
    </div>
  );
}
