import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that we have at least an API key to avoid confusing "invalid API key" errors
if (!firebaseConfig.apiKey) {
  console.warn("Firebase API key is missing. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your environment.");
}

// Initialize Firebase
const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

// When in mock mode without valid credentials, we provide dummy objects to prevent SDK crashes
let app: FirebaseApp, auth: Auth, db: Firestore;

if (isMock && !firebaseConfig.apiKey) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  app = { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as any;
  auth = { onAuthStateChanged: () => () => {} } as any;
  // Use a Proxy for db to prevent crashes when accessing collection/doc/etc.
  db = new Proxy({}, {
    get: () => () => ({})
  }) as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
} else {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
