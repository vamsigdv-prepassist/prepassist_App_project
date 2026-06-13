import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, initializeAuth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "prepassist-v2.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "prepassist-v2",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "prepassist-v2.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase safely (prevents duplicate app error during hot-reloading)
let app;
let isNewApp = false;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  isNewApp = true;
} else {
  app = getApp();
}

// Initialize Firebase services
let dbInstance;
if (isNewApp) {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} else {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
export const storage = getStorage(app);

// Initialize Firebase Auth with AsyncStorage for persistence on mobile
let authInstance;
if (isNewApp) {
  if (Platform.OS === 'web') {
    // Web browsers handle persistence automatically natively
    authInstance = getAuth(app);
  } else {
    // We must require this conditionally, otherwise it crashes the Web bundler
    const { getReactNativePersistence } = require('firebase/auth');
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  }
} else {
  authInstance = getAuth(app);
}
export const auth = authInstance;
