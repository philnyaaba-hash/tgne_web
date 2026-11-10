'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import InquiryForm from './inquiry-form';
import Icon from './icons';

export default function ServiceRequestGrid({ services }) {
  const [selectedService, setSelectedService] = useState('');
  const [contactMethod, setContactMethod] = useState('form');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedService && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!selectedService && dialog.open) {
      dialog.close();
    }
  }, [selectedService]);

  return (
    <>
      <div className="tgne-service-grid tgne-service-grid-page">
        {services.map((service, index) => (
          <article className="tgne-service-card" id={service.id} key={service.title}>
            <span className="tgne-service-top"><span>0{index + 1}</span><Icon name={service.icon} size={20} /></span>
            <h2>{service.title}</h2>
            <p>{service.copy}</p>
            <button
              type="button"
              className="tgne-service-link"
              aria-haspopup="dialog"
              aria-controls="tgne-service-request-dialog"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setSelectedService(service.title);
              }}
            >
              Request this service <Icon name="arrowRight" size={14} />
            </button>
          </article>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        id="tgne-service-request-dialog"
        className="tgne-service-dialog"
        aria-labelledby="tgne-service-dialog-title"
        aria-describedby="tgne-service-dialog-intro"
        onCancel={(event) => {
          event.preventDefault();
          setSelectedService('');
          setContactMethod('form');
        }}
        onClose={() => {
          setSelectedService('');
          setContactMethod('form');
          window.requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) setSelectedService('');
        }}
      >
        <div className="tgne-service-dialog-head">
          <div>
            <div className="tgne-service-dialog-brand">
              <span className="tgne-service-dialog-mark">
                <Image src="/assets/tgne-logo.png" alt="" width={42} height={42} />
              </span>
              <span>
                <strong>TGNE Solutions</strong>
                <small>Technology & design</small>
              </span>
            </div>
            <p className="ls-eyebrow"><span /> Service request</p>
            <h2 id="tgne-service-dialog-title">{selectedService}</h2>
            <p id="tgne-service-dialog-intro">Choose how you would like to reach us.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="tgne-service-dialog-close" aria-label="Close service request" onClick={() => setSelectedService('')}>
            <Icon name="close" size={19} />
          </button>
        </div>
        <div className="tgne-service-dialog-options">
          <button type="button" className="tgne-service-option-button" onClick={() => setContactMethod('form')}>
            <span className="tgne-option-icon"><Icon name="mail" size={16} /></span>
            <span>Send a message</span>
            <span className="tgne-option-desc">Fill out the form and we will reply</span>
          </button>
          <button type="button" className="tgne-service-option-button" onClick={() => setContactMethod('whatsapp')}>
            <span className="tgne-option-icon"><Icon name="message" size={16} /></span>
            <span>Message on WhatsApp</span>
            <span className="tgne-option-desc">Chat directly with our team</span>
          </button>
        </div>
        {contactMethod === 'form' && selectedService ? (
          <InquiryForm key={selectedService} defaultService={selectedService} heading="Your details" />
        ) : null}
        {contactMethod === 'whatsapp' && selectedService ? (
          <div className="tgne-service-whatsapp">
            <p className="ls-eyebrow"><span /> WhatsApp message</p>
            <h3>Message us on WhatsApp</h3>
            <p>Tap the button below to open WhatsApp with your service request pre-filled.</p>
            <a
              href={`https://wa.me/${LAND_SITE.phone.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(`Hello TGNE Solutions, I am interested in: ${selectedService}. Please share more details.`)}`}
              className="ls-button ls-button-primary"
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="arrowUpRight" size={15} />
              Open WhatsApp chat
            </a>
          </div>
        ) : null}
      </dialog>
    </>
  );
}