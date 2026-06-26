import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
let GoogleSignin: any = null;
try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch (e) {
  // Gracefully fail in Expo Go
}

import { auth, db } from "@/lib/firebase";

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  user: User | null;
  profile: { credits: number; tier: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  signInWithGoogleIdToken: (idToken: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ credits: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubscribeProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap: any) => {
          setProfile({
            credits: docSnap.exists() ? docSnap.data().credits ?? 0 : 0,
            tier: docSnap.exists() ? docSnap.data().tier ?? "free" : "free",
          });
          setLoading(false);
        }, (error: any) => {
          console.error("Failed to sync profile:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err: any) {
      return err?.message ?? "An error occurred during sign in.";
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        
        // CRITICAL FIX: Initialize the Firestore Profile immediately upon mobile signup
        // Matches the Web App's initialization payload
        const userRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userRef, {
           userId: userCredential.user.uid,
           email: userCredential.user.email,
           fullName: name,
           credits: 10,
           tier: "free",
           role: "student",
           createdAt: new Date().toISOString()
        });
      }
      return null;
    } catch (err: any) {
      return err?.message ?? "An error occurred during sign up.";
    }
  }, []);

  const signInWithGoogleIdToken = useCallback(async (idToken: string): Promise<string | null> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      return null;
    } catch (err: any) {
      return err?.message ?? "An error occurred during Google Sign In.";
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        try {
          if (GoogleSignin) {
            await GoogleSignin.signOut();
          }
        } catch (e) {
          // Ignore error if not signed in with Google
        }
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error", err);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return null;
    } catch (err: any) {
      return err?.message ?? "An error occurred while sending the reset email.";
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogleIdToken,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
