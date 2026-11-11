'use client';

import { useEffect, useRef } from 'react';

const VIDEO_SRC = 'https://res.cloudinary.com/ea91sdts/video/upload/q_auto:eco,vc_auto,w_1280,c_limit/v1794427414/Embroidery_machine_stitching_log__1b9c800a.mp4';

export default function HeroBackgroundVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePlayback = () => {
      if (motionPreference.matches) {
        video.pause();
        return;
      }

      video.play().catch(() => {
        video.dataset.autoplayBlocked = 'true';
      });
    };

    updatePlayback();
    motionPreference.addEventListener('change', updatePlayback);
    return () => {
      motionPreference.removeEventListener('change', updatePlayback);
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="tgne-hero-background-video"
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  );
}
