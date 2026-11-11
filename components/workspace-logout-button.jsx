'use client';

import { useState } from 'react';
import { clearCachedUserState } from '../lib/session-cleanup';

export default function WorkspaceLogoutButton() {
  const [error, setError] = useState('');

  async function handleLogout() {
    setError('');
    clearCachedUserState();
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your session could not be invalidated.');
      window.location.assign('/login');
    } catch (logoutError) {
      setError(logoutError.message || 'Sign out could not be completed. Please try again.');
    }
  }

  return (
    <div className="dashboard-logout-bar" style={{ marginBottom: 16 }}>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        onClick={handleLogout}
        className="dashboard-logout-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid var(--ls-line)',
          background: 'transparent',
          color: 'var(--ls-ink)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color .15s ease'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </svg>
        Sign out
      </button>
    </div>
  );
}
