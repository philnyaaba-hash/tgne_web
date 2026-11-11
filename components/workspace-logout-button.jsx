'use client';

import { useState } from 'react';
import { clearCachedUserState } from '../lib/session-cleanup';

export default function WorkspaceLogoutButton({ className = '' }) {
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
    <div className={className}>
      {error && <p className="office-error" role="alert">{error}</p>}
      <button
        type="button"
        onClick={handleLogout}
        className="office-button secondary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </svg>
        Sign out
      </button>
    </div>
  );
}
