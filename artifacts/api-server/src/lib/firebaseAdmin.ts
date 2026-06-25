import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getAdminDb() {
  if (getApps().length === 0) {
    const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n') || "";
    const clientEmail = process.env.GCP_CLIENT_EMAIL || "";
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return getFirestore();
}

export const adminDb = getAdminDb();
export const adminAuth = getAuth();
