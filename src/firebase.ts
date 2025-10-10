import firebase from 'firebase/compat/app';
import 'firebase/compat/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

let analytics;

if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  analytics = firebase.analytics();
} else {
  console.error("Firebase config is missing. Please set up your .env file.");
}

export { analytics };
