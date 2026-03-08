import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'mock-project-id';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'mock@example.com';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'mock-private-key';

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL: `https://${projectId}.firebaseio.com`,
    });
  } else {
    // In dev/mock mode, we might not have real credentials.
    // For now, let's just initialize with dummy values if we are in a mock environment
    // or allow it to fail gracefully if it must.
    // However, to satisfy the 'cert' requirement, we might need a structured object.
    console.warn("Firebase Admin initialized with mock/empty credentials. This is only for development.");
    admin.initializeApp({
      projectId: projectId,
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
