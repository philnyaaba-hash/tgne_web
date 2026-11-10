import { LAND_SITE } from '../../lib/land-site';
import { absoluteSiteUrl } from '../../lib/site-metadata';

function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function OrganizationStructuredData() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': ['Organization', 'LocalBusiness'],
        '@id': absoluteSiteUrl('/#organization'),
        name: LAND_SITE.name,
        url: absoluteSiteUrl('/'),
        logo: absoluteSiteUrl('/icons/icon-512.png'),
        image: absoluteSiteUrl('/assets/tgne-share.png'),
        description: LAND_SITE.description,
        email: LAND_SITE.email,
        telephone: LAND_SITE.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: LAND_SITE.address,
          addressLocality: 'Tema',
          addressRegion: 'Greater Accra',
          addressCountry: 'GH'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 5.6645849,
          longitude: -0.0183284
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:00',
            closes: '17:00'
          }
        ],
        areaServed: [{ '@type': 'Country', name: 'Ghana' }],
        sameAs: [LAND_SITE.facebookUrl, LAND_SITE.googleReviewsUrl],
        priceRange: 'GHS'
      }}
    />
  );
}

export function BreadcrumbStructuredData({ items }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: absoluteSiteUrl(item.path)
        }))
      }}
    />
  );
}

export function FaqStructuredData({ questions }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
      }}
    />
  );
}
