const { admin, getAdminFirestore, getFirebaseAdminApp } = require("./firebaseAdmin");

const ACTIVE_BOOKING_STATUSES = new Set(["active", "confirmed"]);

function normalizeText(value, maxLength = 3000) {
  return String(value || "").trim().slice(0, maxLength);
}

function serializeTimestamp(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function getTimestampMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProviderIds(userRecord) {
  return [
    ...new Set(
      (Array.isArray(userRecord?.providerData) ? userRecord.providerData : [])
        .map((provider) => normalizeText(provider.providerId, 120))
        .filter(Boolean)
    ),
  ];
}

async function listAllAuthUsers() {
  const auth = admin.auth(getFirebaseAdminApp());
  const users = [];
  let pageToken = undefined;

  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

function createEmptyCounts() {
  return {
    activeBookings: 0,
    completedBookings: 0,
    bookingRequests: 0,
  };
}

function getCountsForUid(countsByUid, uid) {
  if (!countsByUid.has(uid)) {
    countsByUid.set(uid, createEmptyCounts());
  }

  return countsByUid.get(uid);
}

async function getUserBookingCounts() {
  const db = getAdminFirestore();
  const countsByUid = new Map();
  const [bookingsSnapshot, bookingRequestsSnapshot] = await Promise.all([
    db.collection("bookings").get(),
    db.collection("bookingRequests").get(),
  ]);

  bookingsSnapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data() || {};
    const uid = normalizeText(data.uid, 200);
    const status = normalizeText(data.status, 80).toLowerCase();

    if (!uid) {
      return;
    }

    const counts = getCountsForUid(countsByUid, uid);

    if (ACTIVE_BOOKING_STATUSES.has(status)) {
      counts.activeBookings += 1;
    } else if (status === "completed") {
      counts.completedBookings += 1;
    }
  });

  bookingRequestsSnapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data() || {};
    const uid = normalizeText(data.uid, 200);

    if (!uid) {
      return;
    }

    getCountsForUid(countsByUid, uid).bookingRequests += 1;
  });

  return countsByUid;
}

function mapAdminUser(userRecord, profileSnapshot, counts = createEmptyCounts()) {
  const profileExists = Boolean(profileSnapshot?.exists);
  const profileData = profileExists ? profileSnapshot.data() || {} : {};
  const profileName = normalizeText(profileData.name, 300);
  const profileDisplayName = normalizeText(profileData.displayName, 300);
  const authEmail = normalizeText(userRecord.email, 320);
  const profileEmail = normalizeText(profileData.email, 320);
  const authDisplayName = normalizeText(userRecord.displayName, 300);
  const providerIds = getProviderIds(userRecord);

  return {
    uid: normalizeText(userRecord.uid, 200),
    email: authEmail || profileEmail,
    displayName: authDisplayName || profileDisplayName || profileName,
    photoURL:
      normalizeText(userRecord.photoURL, 1000) ||
      normalizeText(profileData.photoURL, 1000),
    phoneNumber: normalizeText(userRecord.phoneNumber, 120),
    emailVerified: userRecord.emailVerified === true,
    disabled: userRecord.disabled === true,
    providerIds,
    createdAt: serializeTimestamp(userRecord.metadata?.creationTime),
    lastSignInAt: serializeTimestamp(userRecord.metadata?.lastSignInTime),
    profileExists,
    name: profileName,
    phone: normalizeText(profileData.phone, 120),
    phoneVerified: profileData.phoneVerified === true,
    phoneVerifiedAt: serializeTimestamp(profileData.phoneVerifiedAt),
    emailVerifiedSyncedAt: serializeTimestamp(profileData.emailVerifiedSyncedAt),
    activeBookings: counts.activeBookings || 0,
    completedBookings: counts.completedBookings || 0,
    bookingRequests: counts.bookingRequests || 0,
  };
}

async function getAdminUsers() {
  const db = getAdminFirestore();
  const [authUsers, countsByUid] = await Promise.all([
    listAllAuthUsers(),
    getUserBookingCounts(),
  ]);
  const profileRefs = authUsers.map((userRecord) =>
    db.collection("users").doc(userRecord.uid)
  );
  const profileSnapshots = profileRefs.length > 0 ? await db.getAll(...profileRefs) : [];

  return authUsers
    .map((userRecord, index) =>
      mapAdminUser(
        userRecord,
        profileSnapshots[index],
        countsByUid.get(userRecord.uid) || createEmptyCounts()
      )
    )
    .sort((left, right) => getTimestampMillis(right.createdAt) - getTimestampMillis(left.createdAt));
}

module.exports = {
  getAdminUsers,
};
