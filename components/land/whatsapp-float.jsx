import { LAND_SITE } from '../../lib/land-site';

export default function WhatsAppFloat() {
  const phone = LAND_SITE.phone.replace(/\D/g, '');
  const message = 'Hello TGNE Solutions, I would like to know more about your services.';

  return (
    <a
      className="ls-whatsapp-float"
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with TGNE Solutions on WhatsApp"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16.04 3.2a12.68 12.68 0 0 0-10.9 19.17L3.43 28.8l6.58-1.72a12.77 12.77 0 0 0 6.03 1.52h.01A12.7 12.7 0 0 0 16.04 3.2Zm0 23.27h-.01a10.57 10.57 0 0 1-5.39-1.48l-.39-.23-3.9 1.02 1.04-3.8-.25-.4a10.55 10.55 0 1 1 8.9 4.89Zm5.79-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.22.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.36-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.06 1.3 3.27c.16.21 2.23 3.41 5.4 4.78.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
      <span>Chat with us</span>
    </a>
  );
}
