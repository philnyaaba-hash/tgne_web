'use client';

import { CLIENT_DEMO_STORAGE_KEY } from './client-demo-data';

// Clears every browser-side trace of the previous account. Called before the
// sign-out request and again after a successful sign-in, so switching accounts
// in the same tab never shows the previous user's cached workspace data.
export function clearCachedUserState() {
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (key === 'landledger.session.v1' || key === CLIENT_DEMO_STORAGE_KEY || key.startsWith(CLIENT_DEMO_STORAGE_KEY + ':')) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Private mode or a disabled storage API; nothing to clear.
  }
  try {
    window.sessionStorage.removeItem('ll.assistant.v1');
  } catch {
    // Same as above.
  }
}
