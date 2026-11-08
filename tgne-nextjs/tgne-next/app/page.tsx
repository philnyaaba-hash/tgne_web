<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b1f16">
<title>Asante Land</title>
<link rel="icon" type="image/jpeg" href="/assets/brand-logo.jpg">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div class="app">
<aside class="sidebar" id="sidebar" aria-label="Main navigation">
<div class="brand">
<img class="brand-logo" src="/assets/brand-logo.jpg" alt="Asante Land logo">
</div>
<nav class="nav" id="nav" role="navigation" aria-label="Main navigation">
<a href="#explore">Explore land</a><a href="#how-it-works">How it works</a><a href="#sell-land">Sell land</a><a href="#about">About</a><a href="#contact">Contact</a>
</nav>
</aside>
<main class="view" id="view">
<div class="content">
<h1>Asante Land</h1>
<p>Land you can stand on, with papers you can check.</p>
<div class="stats"><b>10</b>Regions covered<b>7</b>Land listed<b>18</b>acres</div>
</div>
</main>
<footer>
<p>© 2026 Asante Land Company. All rights reserved.<br>Accra, Ghana<br>Monday to Friday, 8:30am – 5:00pm</p>
</div>
</main>
<script src="/js/store.js"></script>
<script src="/js/core.js"></script>
</body>
</html>

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header><div className="w">
        <Link className="logo" href="/"><span className="mk">T</span><span>TGNE Solutions<small>Dream it, See it.</small></span></Link>
        <nav aria-label="Primary"><a href="#services">Services</a><a href="#how">How we work</a><a href="#faq">FAQ</a><a href="#contact">Contact</a><a href="#partners">Affiliates</a></nav>
        <StudioStatus /><a className="btn" href="#contact">Get a quote</a>
      </div></header>

      <main id="main">
        <div className="hero"><div className="w">
          <div>
            <span className="tag">Tema, Ghana · ICT · Design & Print · Education</span>
            <h1>Welcome to tgne solutions</h1>
            <p>Our core aim it to ensure our clients receive value for money. Our pledge is to be truthful to our clients in guaranteeing that we will nurture a fruitful working relationship to ensure expedited service delivery.</p>
            <form className="srch" action="/#services" method="get">
              <div><label htmlFor="area">Area</label><select id="area" name="area" defaultValue={area}><option value="">All areas</option><option>Graphics</option><option>Technology</option><option>ICT Education</option></select></div>
              <div><label htmlFor="need">I need</label><select id="need" name="need" defaultValue={need}><option value="">Anything</option>{["logo","print","website","hardware","domain","training"].map(n => <option key={n}>{n}</option>)}</select></div>
              <button className="btn dk" type="submit">Find a service</button>
            </form>
            <div className="stats"><div><b>7</b><span>Services</span></div><div><b>4.8</b><span>Google rating</span></div><div><b>10</b><span>Reviews</span></div></div>
          </div>
          <BrandCard />
        </div></div>

        <div className="tick" aria-hidden="true"><div>{[0, 1].map(i => <span key={i}>Graphics ✦ Technology ✦ ICT Education ✦ </span>)}</div></div>

        <section id="services"><div className="w">
          <div className="hd"><div><small>What we do</small><h2>Seven services, one team</h2></div>{(area || need) && <Link className="btn o" href="/#services">Clear filters</Link>}</div>
          <div className="grid">{list.map(s => (
            <article className="card" key={s.k}>
              <div className="art"><ServiceArt k={s.k} c={s.color} /><span className="pill">{s.area}</span></div>
              <div className="cb"><h3>{s.name}</h3><p>{s.desc}</p>
                <div className="meta">{s.items.map(x => <span key={x}>{x}</span>)}</div>
                <a className="btn dk" href="#contact">Ask about this</a></div>
            </article>))}</div>
          {!list.length && <p className="none">Nothing matches that combination. Try "All areas", or call us.</p>}</div></section>

          <section id="how" className="dark"><div className="w">
            <div className="hd"><div><small>How we work</small><h2>The client sits at the centre of everything</h2></div></div>
            <ol className="steps">{PROCESS.map(([t, d], i) => <li key={t}><b>{i + 1}</b><h3>{t}</h3><p>{d}</p></li>)}</ol>
          </div></section>}

          <section id="faq" style={{ paddingTop: 0 }}><div className="w narrow">
            <div className="hd"><div><small>Good to know</small><h2>Questions, answered</h2></div></div>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div></section>

          <section id="contact" style={{ paddingTop: 0 }}><div className="w cg"><div><div className="hd" style={{ marginBottom: 10 }}><div><small>Talk to us</small><h2>Dream it with us.</h2></div></div>
            <p className="mut">Call, WhatsApp or send a note. We reply within a business day.</p>
            <div className="row"><a className="btn dk" href="tel:+233558122767">Call 055 812 2767</a><a className="btn o" href={`https://wa.me/${WA}`} target="_blank" rel="noopener">WhatsApp</a></div>
            <ul className="cl"><li><b>Visit</b>MKT/A/39, Community 11, Tema</li><li><b>Mail</b>P. O. Box CO4197, Community 1, Tema</li><li><b>Phones</b>055 812 2767, 054 580 3895, 030 331 1355</li><li><b>Hours</b>Monday to Friday, 8am to 5pm</li></ul></div>
            <ContactForm /></div></section>
      </main>

      <footer><div className="w"><div className="fg">
        <div><div className="logo"><span className="mk">T</span><span>TGNE Solutions</span></div><p>Dream it, See it. A bouquet of services in Tema, Ghana.</p></div>
        <div><h4>Explore</h4><a href="#services">Services</a><a href="#how">How we work</a><a href="#faq">FAQ</a></div>
        <div><h4>Follow</h4><a href="https://web.facebook.com/tgnesolutions" target="_blank" rel="noopener">Facebook</a><a href={`https://wa.me/${WA}`} target="_blank" rel="noopener">WhatsApp</a></div>
        <div><h4>Visit</h4>MKT/A/39, Community 11<br />Tema, Ghana<br />Mon to Fri, 8am to 5pm</div>
        <div className="fb"><span>© 2022 TGNE Solutions Tema. All rights reserved.</span><span>P. O. Box CO4197, Community 1, Tema</span></div></div></footer>
    </>
  );
}