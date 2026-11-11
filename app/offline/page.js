export const metadata = {
  title: 'Offline | TGNE Solutions',
  description: 'TGNE Solutions is temporarily unavailable offline. Reconnect to browse our services and contact the team.',
  robots: { index: false, follow: false }
};

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="offline-card">
        <img className="offline-logo" src="/assets/brand-logo.jpg" alt="LandLedger" width="44" height="44" />
        <p className="offline-eyebrow">LandLedger · Offline</p>
        <h1>You are offline</h1>
        <p>The connection dropped, so this page was not saved on the device. The dashboard shell works offline; the public website always needs a connection. Anything that needs the server resumes when the connection returns.</p>
        <div className="offline-actions">
          <a className="offline-button primary" href="/admin">Retry admin workspace</a>
          <a className="offline-button secondary" href="/">Land storefront</a>
        </div>
        <p className="offline-note">Nothing you entered is lost. Wait for the connection to return, then retry the action.</p>
      </section>
    </main>
  );
}
