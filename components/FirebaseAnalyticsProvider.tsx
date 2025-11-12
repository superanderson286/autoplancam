"use client";

import React from "react";
import Script from "next/script";
import { analytics } from "../firebase";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-8QD9JF8GLW";

export function FirebaseAnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Load gtag.js and initialize with cookie flags and auto domain */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${MEASUREMENT_ID}', { 'cookie_domain': 'auto', 'cookie_flags': 'SameSite=None;Secure' });`}
      </Script>
      {/* still log availability of firebase analytics for debug */}
      <Script id="firebase-analytics-debug" strategy="afterInteractive">
        {`(function(){ try { if (window && ${!!analytics}) { console.log('Firebase Analytics (compat) está disponible.'); } } catch(e){} })()`}
      </Script>
      {children}
    </>
  );
}
