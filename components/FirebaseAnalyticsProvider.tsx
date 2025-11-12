"use client";

import { useEffect } from "react";
import { analytics } from "../firebase";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID || "G-8QD9JF8GLW";

export function FirebaseAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    try {
      if (analytics) {
        console.log("Firebase Analytics (compat) está disponible.");
      }
      // if gtag is present, set cookie flags safely
      const gtag = (window as any).gtag;
      if (typeof gtag === 'function') {
        try {
          gtag('config', GA_MEASUREMENT_ID, { cookie_flags: 'SameSite=None;Secure' });
        } catch (e) {
          console.warn('gtag config failed', e);
        }
      }
    } catch (e) {
      console.warn('FirebaseAnalyticsProvider init failed', e);
    }
  }, []);

  return <>{children}</>;
}
