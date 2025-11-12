"use client";

import firebase from 'firebase/compat/app';
import 'firebase/compat/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let analytics: firebase.analytics.Analytics | null = null; // Tipado explícito para analytics

// Solo inicializa Firebase y Analytics en el cliente y si la configuración es válida
if (typeof window !== 'undefined' && firebaseConfig.projectId) {
  // Si la app de Firebase no ha sido inicializada, la inicializamos.
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  // Una vez que estamos seguros de que la app está inicializada, intentamos obtener analytics si tenemos un measurementId.
  if (firebaseConfig.measurementId) {
    try {
      analytics = firebase.app().analytics();
    } catch (e) {
      console.error('Failed to initialize Analytics', e);
    }
  }
}

export { analytics };
