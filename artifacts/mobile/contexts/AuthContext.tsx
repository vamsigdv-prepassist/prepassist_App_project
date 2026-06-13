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
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as WebBrowser from "expo-web-browser";

import { auth } from "@/lib/firebase";

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  user: User | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
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
