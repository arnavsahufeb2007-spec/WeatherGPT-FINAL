import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { LocationInfo } from "../types.js";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth ? auth.currentUser : null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Initialize Firebase App & Services
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with experimentalAutoDetectLongPolling for stable connectivity across all web & iframe environments
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db: Firestore = firestoreDb;

// 2. Validate Connection to Firestore (on-demand helper, non-blocking)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "test", "connection"));
    return snap.exists();
  } catch {
    return false;
  }
}

// 3. Google Sign-In with Firebase Auth
export async function signInWithGoogleFirebase(): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (err: any) {
    console.error("Firebase Google Auth error:", err);
    return {
      success: false,
      error: err.message || "Failed to sign in with Google Firebase Auth",
    };
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error("Firebase sign out error:", err);
  }
}

export function subscribeToFirebaseAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// 4. Persistence Helpers for Firestore

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  updatedAt: string;
  preferredLanguage?: string;
  temperatureUnit?: "celsius" | "fahrenheit";
}

export async function saveUserProfileToFirestore(profile: FirestoreUserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const ref = doc(db, "users", profile.uid);
    await setDoc(ref, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfileFromFirestore(uid: string): Promise<FirestoreUserProfile | null> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as FirestoreUserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveLocationToFirestore(userId: string, location: LocationInfo): Promise<void> {
  const locId = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
  const path = `users/${userId}/savedLocations/${locId}`;
  try {
    const ref = doc(db, "users", userId, "savedLocations", locId);
    await setDoc(ref, {
      id: locId,
      userId,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      country: location.country || "",
      admin1: location.admin1 || "",
      timezone: location.timezone || "UTC",
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeLocationFromFirestore(userId: string, locationId: string): Promise<void> {
  const path = `users/${userId}/savedLocations/${locationId}`;
  try {
    const ref = doc(db, "users", userId, "savedLocations", locationId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getSavedLocationsFromFirestore(userId: string): Promise<LocationInfo[]> {
  const path = `users/${userId}/savedLocations`;
  try {
    const colRef = collection(db, "users", userId, "savedLocations");
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        country: data.country,
        admin1: data.admin1,
        timezone: data.timezone || "UTC",
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface FirestoreWeatherQuery {
  id: string;
  userId: string;
  query: string;
  reply: string;
  locationName?: string;
  timestamp: string;
}

export async function saveQueryToFirestore(userId: string, queryData: Omit<FirestoreWeatherQuery, "id">): Promise<void> {
  const queryId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${userId}/queries/${queryId}`;
  try {
    const ref = doc(db, "users", userId, "queries", queryId);
    await setDoc(ref, {
      ...queryData,
      id: queryId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getQueriesFromFirestore(userId: string, count = 20): Promise<FirestoreWeatherQuery[]> {
  const path = `users/${userId}/queries`;
  try {
    const colRef = collection(db, "users", userId, "queries");
    const q = query(colRef, orderBy("timestamp", "desc"), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreWeatherQuery);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
