'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function OfflineBanner() {
  const pathname = usePathname();
  const onDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const notifyUpdate = (reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
    };
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        registrationRef.current = reg;
        notifyUpdate(reg);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      })
      .catch(console.error);
    const onControllerChange = () => {
      if (reloadingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = registrationRef.current?.waiting;
    if (!worker) {
      setUpdateReady(false);
      return;
    }
    reloadingRef.current = true;
    worker.postMessage('skipWaiting');
  }, []);

  useEffect(() => {
    const sync = () => setOffline(navigator.onLine === false);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!onDashboard) return null;

  if (updateReady) {
    return (
      <div className="update-banner" role="status" aria-live="polite">
        <div>
          <strong>Update ready</strong>
          <span>A new version of the dashboard is available.</span>
        </div>
        <button type="button" onClick={applyUpdate}>Reload</button>
      </div>
    );
  }

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <strong>Offline</strong>
      <span>The dashboard shell is still available. Actions that need the server resume when the connection returns.</span>
    </div>
  );
}
