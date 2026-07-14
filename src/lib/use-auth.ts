"use client";

import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "This email is already in use.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is disabled in Firebase Authentication.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/user-not-found":
        return "No account found with that email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      default:
        return error.message || "Unable to authenticate.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to authenticate.";
}

async function loadCleverTap() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const module = await import("clevertap-web-sdk");
    return module.default ?? module;
  } catch (error) {
    console.warn("Unable to load CleverTap SDK:", error);
    return null;
  }
}

async function sendCleverTapLogin(user: User, email: string) {
  const clevertap = await loadCleverTap();
  if (!clevertap) return;

  try {
    clevertap.onUserLogin.push({
      Site: {
        Identity: user.uid,
        Email: email,
        Name: email,
      },
    });
  } catch (error) {
    console.warn("CleverTap onUserLogin failed:", error);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.warn("Failed to set Firebase persistence:", error);
      });

      const unsubscribe = onAuthStateChanged(auth, (current) => {
        setUser(current);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error(error);
      setLoading(false);
      return () => {};
    }
  }, []);

  async function login(email: string, password: string) {
    const auth = getFirebaseAuth();
    await setPersistence(auth, browserLocalPersistence);

    const credential = await signInWithEmailAndPassword(auth, email, password).catch((error) => {
      throw new Error(getAuthErrorMessage(error));
    });

    await sendCleverTapLogin(credential.user, email);
    return credential;
  }

  async function register(email: string, password: string) {
    const auth = getFirebaseAuth();
    await setPersistence(auth, browserLocalPersistence);

    const credential = await createUserWithEmailAndPassword(auth, email, password).catch((error) => {
      throw new Error(getAuthErrorMessage(error));
    });

    await sendCleverTapLogin(credential.user, email);
    return credential;
  }

  async function logout() {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }

  return { user, loading, login, register, logout };
}
