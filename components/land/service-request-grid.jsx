'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import FormspreeServiceForm from './formspree-service-form';
import Icon from './icons';

export default function ServiceRequestGrid({ services }) {
  const [selectedService, setSelectedService] = useState('');
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

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
          <article className="tgne-service-card" key={service.title}>
            <span className="tgne-service-top"><span>0{index + 1}</span><Icon name={service.icon} size={20} /></span>
            <h2>{service.title}</h2>
            <p>{service.copy}</p>
            <button
              type="button"
              className="tgne-service-link"
              aria-haspopup="dialog"
              aria-controls="tgne-service-request-dialog"
              onClick={() => setSelectedService(service.title)}
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
        }}
        onClose={() => setSelectedService('')}
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
            <p id="tgne-service-dialog-intro">Share a few details and our team will follow up with a clear next step.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="tgne-service-dialog-close" aria-label="Close service request" onClick={() => setSelectedService('')}>
            <Icon name="close" size={19} />
          </button>
        </div>
        {selectedService ? (
          <FormspreeServiceForm key={selectedService} defaultService={selectedService} />
        ) : null}
      </dialog>
    </>
  );
}