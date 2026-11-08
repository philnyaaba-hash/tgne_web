'use client';

import { BrowserQRCodeReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { api, formatDateTime, Icon, jsonBody, PageHeading, Panel } from './ui';

export default function VerifyPanel({ notify, fail }) {
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function verify(value) {
    const candidate = String(value || '').trim();
    if (!candidate) return;
    setBusy(true);
    setResult(null);
    fail('');
    try {
      const data = await api('/api/visitor-access/verify', { method: 'POST', ...jsonBody({ token: candidate }) });
      setResult(data);
      setHistory((current) => [{ ...data, at: new Date().toISOString(), token: candidate.slice(-10) }, ...current].slice(0, 6));
      notify('Visitor access verified.');
    } catch (reason) {
      setResult({ valid: false, error: reason.message });
      setHistory((current) => [{ valid: false, error: reason.message, at: new Date().toISOString(), token: candidate.slice(-10) }, ...current].slice(0, 6));
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    fail('');
    setResult(null);
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (decoded, _error, controls) => {
        if (decoded) {
          const value = decoded.getText();
          controls.stop();
          controlsRef.current = null;
          setScanning(false);
          setToken(value);
          verify(value);
        }
      });
    } catch (reason) {
      setScanning(false);
      fail(reason.message || 'Camera access is unavailable. Paste a signed token instead.');
    }
  }

  function stopScan() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  return (
    <>
      <PageHeading eyebrow="ACCESS CONTROL" title="Verify a visitor pass" description="Scan the QR code on a temporary card or paste its signed token. Checked-out, cancelled, expired, and re-issued passes are rejected automatically." />
      <div className="office-verify-grid">
        <Panel title="Camera scanner" subtitle="Point the camera at the visitor card QR code.">
          <video ref={videoRef} className={scanning ? 'office-camera active' : 'office-camera'} muted playsInline />
          {scanning
            ? <button className="office-button secondary" type="button" onClick={stopScan}>Stop camera</button>
            : <button className="office-button primary" type="button" onClick={startScan}><Icon name="scan" size={15} /> Start QR scanner</button>}
          <div className="office-scan-hint"><Icon name="shield" size={14} /> Camera frames stay in the browser. Only the decoded token is sent for verification.</div>
        </Panel>

        <form className="office-panel office-token-form" onSubmit={(event) => { event.preventDefault(); verify(token); }}>
          <h2>Manual verification</h2>
          <p className="office-muted">Use this when a physical scanner or camera is unavailable.</p>
          <label>Signed QR token<textarea value={token} onChange={(event) => setToken(event.target.value)} rows="4" placeholder="Paste the token from the visitor card" required /></label>
          <button className="office-button primary" type="submit" disabled={busy || !token.trim()}>{busy ? 'Verifying…' : 'Verify access'}</button>
          {result ? (
            <div className={result.valid ? 'office-verification-result valid' : 'office-verification-result invalid'}>
              <strong><Icon name={result.valid ? 'check' : 'close'} size={15} /> {result.valid ? 'Access valid' : 'Access denied'}</strong>
              {result.valid ? (
                <>
                  <span>{result.visitor.fullName} · {result.visitor.visitorId}</span>
                  <span>Host · {result.host || '—'}{result.department ? ' · ' + result.department : ''}</span>
                  <span>Valid until · {formatDateTime(result.expectedCheckout)}</span>
                </>
              ) : <span>{result.error}</span>}
            </div>
          ) : null}
        </form>
      </div>

      {history.length ? (
        <Panel title="Recent verification attempts" subtitle="Latest checks from this device." className="office-recent-verifications">
          <ul>
            {history.map((item, index) => (
              <li key={item.at + index}>
                <span className={item.valid ? 'office-check-dot valid' : 'office-check-dot invalid'}><Icon name={item.valid ? 'check' : 'close'} size={12} /></span>
                <div><strong>{item.valid ? item.visitor.fullName : 'Rejected credential'}</strong><small>{item.valid ? 'Valid until ' + formatDateTime(item.expectedCheckout) : item.error}</small></div>
                <time>{formatDateTime(item.at)}</time>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
