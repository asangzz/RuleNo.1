import * as admin from 'firebase-admin';

const isConfigValid = !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_CLIENT_EMAIL;

if (!admin.apps.length && isConfigValid) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}

export const adminDb = (isConfigValid ? admin.firestore() : null) as unknown as admin.firestore.Firestore;
export const adminAuth = (isConfigValid ? admin.auth() : null) as unknown as admin.auth.Auth;
