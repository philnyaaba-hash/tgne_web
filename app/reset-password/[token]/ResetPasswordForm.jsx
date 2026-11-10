'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '../../../components/land/icons';
import styles from './reset-password.module.css';

const RESET_API = '/api/auth/reset-password';

export default function ResetPasswordForm({ token }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams?.get('token') || token;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!urlToken) {
      setError('No reset token provided. Please request a new reset link.');
    }
  }, [urlToken]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setStatus('submitting');

      if (password !== confirm) {
        setStatus('error');
        setError('Passwords do not match.');
        return;
      }

      try {
        const res = await fetch(RESET_API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token: urlToken, password }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus('error');
          setError(data?.error || 'Reset failed. Please request a new link.');
          return;
        }

        setStatus('ok');
      } catch {
        setStatus('error');
        setError('We could not reach the sign-in service. Check your connection and try again.');
      }
    },
    [password, confirm, urlToken]
  );

  if (status === 'ok') {
    return (
      <div className={styles.resetPage} aria-label="Password reset complete">
        <a href="/login" className="sr-only">
          Back to sign in
        </a>
        <main className={styles.resetCard}>
          <div className={styles.resetBrand}>
            <div className={styles.resetMark}>
              <Image src="/icons/icon-512.png" alt="" width={64} height={64} loading="eager" />
            </div>
            <div className={styles.resetBrandName}>TGNE Solutions</div>
            <div className={styles.resetBrandTag}>Secure workspace</div>
          </div>

          <div className={styles.resetSuccess} role="status" aria-live="polite">
            <div className={styles.check}>
              <Icon name="check" size={28} />
            </div>
            <h2>Password reset</h2>
            <p>Your password has been changed successfully. You can now sign in with your new password.</p>
          </div>

          <div className={styles.resetBack}>
            <a href="/login">Sign in &rarr;</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.resetPage} aria-label="Reset password">
      <a href="#content" className="sr-only">
        Skip to content
      </a>
      <main id="content" className={styles.resetCard}>
        <div className={styles.resetBrand}>
          <div className={styles.resetMark}>
            <Image src="/icons/icon-512.png" alt="" width={64} height={64} loading="eager" />
          </div>
          <div className={styles.resetBrandName}>TGNE Solutions</div>
          <div className={styles.resetBrandTag}>Set a new password</div>
        </div>

        <div className={styles.resetHead}>
          <h1>Reset your password</h1>
          <p>Choose a new password for your TGNE workspace account.</p>
        </div>

        {error ? (
          <div className={styles.resetAlert} role="alert" aria-live="polite">
            <span className={styles.icon} aria-hidden="true">
              <Icon name="close" size={16} />
            </span>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.resetField}>
            <label htmlFor="reset-password"><span className={styles.dot} aria-hidden="true"></span>New password</label>
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${styles.resetInput} ${error ? styles.resetInputError : ''}`}
              minLength={8}
              required
            />
          </div>

          <div className={styles.resetField}>
            <label htmlFor="reset-confirm"><span className={styles.dot} aria-hidden="true"></span>Confirm password</label>
            <input
              id="reset-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`${styles.resetInput} ${error ? styles.resetInputError : ''}`}
              minLength={8}
              required
            />
          </div>

          <div className={styles.resetActions}>
            <button type="submit" className={styles.resetSubmit} disabled={status === 'submitting' || !urlToken}>
              {status === 'submitting' ? (
                <>
                  <span className={styles.resetSpinner} aria-hidden="true"></span>
                  Resetting…
                </>
              ) : (
                <>
                  <Icon name="arrowRight" size={15} />
                  Set new password
                </>
              )}
            </button>
          </div>
        </form>

        <div className={styles.resetBack}>
          <a href="/login">Back to sign in &rarr;</a>
        </div>

        <div className={styles.resetFooter}>
          TGNE Solutions · Technology, design and ICT support in Tema, Ghana.
        </div>
        <p className={styles.resetDisclaimer}>
          Demo credentials are for evaluation only and do not connect to live client data.
        </p>
      </main>
    </div>
  );
}
