'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import Icon from '../../components/land/icons';
import styles from './forgot-password.module.css';

const FORGOT_API = '/api/auth/forgot-password';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setStatus('submitting');

      try {
        const res = await fetch(FORGOT_API, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStatus('error');
          setError(data?.error || 'Something went wrong. Please try again.');
          return;
        }

        setStatus('ok');
      } catch {
        setStatus('error');
        setError('We could not reach the sign-in service. Check your connection and try again.');
      }
    },
    [email]
  );

  if (status === 'ok') {
    return (
      <div className={styles.forgotPage} aria-label="Password reset">
        <a href="/login" className="sr-only">
          Back to sign in
        </a>
        <main className={styles.forgotCard}>
          <div className={styles.forgotBrand}>
            <div className={styles.forgotMark}>
              <Image src="/icons/icon-512.png" alt="" width={64} height={64} loading="eager" />
            </div>
            <div className={styles.forgotBrandName}>TGNE Solutions</div>
            <div className={styles.forgotBrandTag}>Secure workspace</div>
          </div>

          <div className={styles.forgotSuccess} role="status" aria-live="polite">
            <div className={styles.check}>
              <Icon name="check" size={28} />
            </div>
            <h2>Reset link sent</h2>
            <p>
              If an account exists for {email}, you will receive an email with a secure link to set a new password.
            </p>
          </div>

          <div className={styles.forgotBack}>
            <a href="/login">Back to sign in &rarr;</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.forgotPage} aria-label="Forgot password">
      <a href="#content" className="sr-only">
        Skip to content
      </a>
      <main id="content" className={styles.forgotCard}>
        <div className={styles.forgotBrand}>
          <div className={styles.forgotMark}>
            <Image src="/icons/icon-512.png" alt="" width={64} height={64} loading="eager" />
          </div>
          <div className={styles.forgotBrandName}>TGNE Solutions</div>
          <div className={styles.forgotBrandTag}>Reset your password</div>
        </div>

        <div className={styles.forgotHead}>
          <h1>Forgot password?</h1>
          <p>Enter the email address on your TGNE workspace account and we will send you a secure reset link.</p>
        </div>

        {error ? (
          <div className={styles.forgotAlert} role="alert" aria-live="polite">
            <span className={styles.icon} aria-hidden="true">
              <Icon name="close" size={16} />
            </span>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.forgotField}>
            <label htmlFor="forgot-email"><span className={styles.dot} aria-hidden="true"></span>Email address</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className={`${styles.forgotInput} ${error ? styles.forgotInputError : ''}`}
              required
            />
          </div>

          <div className={styles.forgotActions}>
            <button type="submit" className={styles.forgotSubmit} disabled={status === 'submitting'}>
              {status === 'submitting' ? (
                <>
                  <span className={styles.forgotSpinner} aria-hidden="true"></span>
                  Sending…
                </>
              ) : (
                <>
                  <Icon name="arrowRight" size={15} />
                  Send reset link
                </>
              )}
            </button>
          </div>
        </form>

        <div className={styles.forgotBack}>
          <a href="/login">Remembered your password? Sign in &rarr;</a>
        </div>

        <div className={styles.forgotFooter}>
          TGNE Solutions · Technology, design and ICT support in Tema, Ghana.
        </div>
        <p className={styles.forgotDisclaimer}>
          Demo credentials are for evaluation only and do not connect to live client data.
        </p>
      </main>
    </div>
  );
}
