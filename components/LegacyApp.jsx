'use client';

import { useEffect } from 'react';
import shellMarkup from './shell-markup';

// Load order matters: each file builds on globals from the ones before it.
const SCRIPTS = [
  'store', 'notifications', 'auth', 'core', 'finance-core', 'finance-app',
  'views-dashboard', 'views-land', 'views-sales', 'views-buyers',
  'views-accounting', 'views-finance', 'staff', 'operations', 'modals',
  'records', 'accounting', 'client-vault', 'complaints', 'events', 'command-palette',
];

let booted = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(el);
  });
}

export default function LegacyApp() {
  useEffect(() => {
    document.body.classList.add('auth-locked');
    if (booted) return;
    booted = true;
    (async () => {
      for (const name of SCRIPTS) await loadScript('/legacy/' + name + '.js');
      // The scripts expect to run before DOMContentLoaded; fire it once they are ready.
      document.dispatchEvent(new Event('DOMContentLoaded'));
    })().catch(console.error);
  }, []);

  return (
    <div id="legacy-root" dangerouslySetInnerHTML={{ __html: shellMarkup }} suppressHydrationWarning />
  );
}
