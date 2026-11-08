import Link from 'next/link';
import Icon from '../land/icons';
import { TGNE_SHOP_CATEGORIES, TGNE_SHOP_ITEMS } from '../../lib/tgne-shop';

function enquiryLink(item) {
  const message = `Hello TGNE Solutions, I am interested in ${item.title}. Please share current availability, pricing, and how to order.`;
  return `https://wa.me/233558122767?text=${encodeURIComponent(message)}`;
}

function filterHref(category, query) {
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (query) params.set('q', query);
  const search = params.toString();
  return search ? `/shop?${search}` : '/shop';
}

export default function ShopBrowser({ category = 'all', query = '' }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = TGNE_SHOP_ITEMS.filter((item) => {
    const matchesCategory = category === 'all' || item.categoryId === category;
    const matchesQuery = !normalizedQuery ||
      `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <div className="tgne-store-toolbar">
        <nav className="tgne-store-categories" aria-label="Filter offerings by category">
          {TGNE_SHOP_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              href={filterHref(item.id, query)}
              className={category === item.id ? 'is-active' : ''}
              aria-current={category === item.id ? 'page' : undefined}
            >
              {item.label}
              {item.id === 'all' ? <span>{TGNE_SHOP_ITEMS.length}</span> : null}
            </Link>
          ))}
        </nav>
        <form className="tgne-store-search" action="/shop" method="get" role="search">
          <Icon name="search" size={17} />
          <label className="tgne-visually-hidden" htmlFor="tgne-shop-query">Search shop offerings</label>
          <input
            id="tgne-shop-query"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search the catalogue"
          />
          {category !== 'all' ? <input type="hidden" name="category" value={category} /> : null}
          <button type="submit" className="tgne-store-search-submit">Search</button>
        </form>
      </div>

      <div className="tgne-store-results">
        <span>{filteredItems.length} {filteredItems.length === 1 ? 'offering' : 'offerings'}</span>
        <span>Availability and pricing confirmed on enquiry</span>
      </div>

      {filteredItems.length ? (
        <div className="tgne-product-grid">
          {filteredItems.map((item, index) => (
            <article className="tgne-product-card" id={`product-${item.id}`} key={item.id}>
              <div className={`tgne-product-visual tgne-product-visual-${item.visual}`} aria-hidden="true">
                <span className="tgne-product-visual-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="tgne-product-art">
                  <span>{item.label}</span>
                  <strong>{item.visual === 'computer' ? 'TECH' : item.visual === 'hosting' ? 'WEB' : item.visual === 'education' ? 'LEARN' : 'TGNE'}</strong>
                  <i />
                </div>
                <span className="tgne-product-visual-icon"><Icon name={item.icon} size={19} /></span>
              </div>
              <div className="tgne-product-content">
                <div className="tgne-product-meta">
                  <span>{item.category}</span>
                  <span><i /> Enquire</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="tgne-product-card-footer">
                  <span>Made for your needs</span>
                  <a href={enquiryLink(item)} target="_blank" rel="noreferrer" aria-label={`${item.action} about ${item.title}`}>
                    {item.action} <Icon name="arrowUpRight" size={15} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="tgne-store-empty">
          <span><Icon name="search" size={21} /></span>
          <h2>No matching offerings</h2>
          <p>Try a different search or choose another category.</p>
          <Link href="/shop" className="ls-button ls-button-secondary">Show all offerings</Link>
        </div>
      )}
    </>
  );
}
