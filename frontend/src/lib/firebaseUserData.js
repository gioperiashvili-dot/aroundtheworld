import {
  addDoc,
  collection,
  doc,
  getFirestore,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseApp } from "./firebaseClient";

function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

function getTimestampMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapFirestoreDocument(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

function sortByCreatedAtDesc(items) {
  return [...items].sort(
    (left, right) =>
      getTimestampMillis(right.createdAt) - getTimestampMillis(left.createdAt)
  );
}

export async function ensureUserProfile(user, overrides = {}) {
  const db = getFirebaseDb();

  if (!db || !user?.uid) {
    return null;
  }

  const profileRef = doc(db, "users", user.uid);
  const profileSnapshot = await getDoc(profileRef);
  const displayName =
    typeof overrides.displayName === "string"
      ? overrides.displayName.trim()
      : user.displayName || "";
  const profileData = {
    uid: user.uid,
    email: user.email || overrides.email || "",
    displayName,
    updatedAt: serverTimestamp(),
  };

  if (!profileSnapshot.exists()) {
    profileData.createdAt = serverTimestamp();
  }

  await setDoc(profileRef, profileData, { merge: true });
  return profileRef;
}

export async function fetchUserProfile(uid) {
  const db = getFirebaseDb();

  if (!db || !uid) {
    return null;
  }

  const profileSnapshot = await getDoc(doc(db, "users", uid));
  return profileSnapshot.exists()
    ? {
        id: profileSnapshot.id,
        ...profileSnapshot.data(),
      }
    : null;
}

export async function saveUserPhoneIfMissing(user, phone) {
  const db = getFirebaseDb();
  const trimmedPhone = String(phone || "").trim();

  if (!db || !user?.uid || !trimmedPhone) {
    return null;
  }

  const profileRef = doc(db, "users", user.uid);
  const profileSnapshot = await getDoc(profileRef);
  const existingPhone = String(profileSnapshot.data()?.phone || "").trim();

  if (existingPhone) {
    return profileRef;
  }

  const profileData = {
    uid: user.uid,
    email: user.email || "",
    phone: trimmedPhone,
    updatedAt: serverTimestamp(),
  };

  if (!profileSnapshot.exists()) {
    profileData.displayName = user.displayName || "";
    profileData.createdAt = serverTimestamp();
  }

  await setDoc(profileRef, profileData, { merge: true });
  return profileRef;
}

export async function saveTourBookingRequestForUser(user, payload) {
  const db = getFirebaseDb();

  if (!db || !user?.uid) {
    return null;
  }

  const selectedTour = payload?.selectedTour || {};
  const now = serverTimestamp();

  return addDoc(collection(db, "bookingRequests"), {
    uid: user.uid,
    email: payload.customerEmail || user.email || "",
    customerName: payload.customerName || user.displayName || "",
    displayName: payload.customerName || user.displayName || "",
    phone: payload.customerPhone || "",
    serviceType: "tour",
    category: selectedTour.category || "",
    tourId: selectedTour.id || "",
    tourTitle: selectedTour.title || "",
    message: payload.customerMessage || "",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

export async function fetchUserProfileBookings(uid) {
  const db = getFirebaseDb();

  if (!db || !uid) {
    return {
      bookingRequests: [],
      bookings: [],
    };
  }

  const [bookingRequestsSnapshot, bookingsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "bookingRequests"), where("uid", "==", uid))),
    getDocs(query(collection(db, "bookings"), where("uid", "==", uid))),
  ]);

  return {
    bookingRequests: sortByCreatedAtDesc(
      bookingRequestsSnapshot.docs.map(mapFirestoreDocument)
    ),
    bookings: sortByCreatedAtDesc(bookingsSnapshot.docs.map(mapFirestoreDocument)),
  };
}
