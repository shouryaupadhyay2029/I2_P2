import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc,
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { logFirebaseError } from "../firebase/errorLogging";

const NOTIFICATIONS_COLLECTION = "notifications";
const NOTIFICATION_READS_COLLECTION = "notificationReads";
const ACTIVITIES_COLLECTION = "activities";

/**
 * Creates a new notification document for a user.
 */
export const createNotification = async (userId, type, title, message, eventId = null, metadata = {}) => {
  if (!userId) return null;
  const notifsCol = collection(db, NOTIFICATIONS_COLLECTION);
  const newDocRef = doc(notifsCol);
  
  const notification = {
    id: newDocRef.id,
    userId,
    type,
    title,
    message,
    eventId,
    isRead: false,
    createdAt: new Date().toISOString(), // Keeping ISO string for user-specific notification backward compat
    metadata
  };

  try {
    await setDoc(newDocRef, notification);
    return notification;
  } catch (error) {
    logFirebaseError("[createNotification] Failed to create notification document.", error);
    return null;
  }
};

/**
 * Creates a global notification when a new event is published.
 * Uses a deterministic document ID (event_published_{eventId}) to guarantee idempotency
 * against React StrictMode, double-clicks, and network retries.
 * Uses Firestore serverTimestamp() for canonical creation time.
 */
export const createEventPublishedNotification = async (event) => {
  if (!event || !event.id) return null;

  const eventId = event.id;
  const notifId = `event_published_${eventId}`;
  const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notifId);

  // Resolve publishing club/organizer name with fallbacks:
  // event.clubName -> event.organizer -> event.creatorName -> "NexEvent Organizer"
  const clubName = (event.clubName || event.organizer || event.creatorName || "NexEvent Organizer").trim();
  
  let message = `"${event.title}" has been published by ${clubName}.`;
  if (event.clubHours?.enabled && event.clubHours.participationHours > 0) {
    message = `"${event.title}" has been published by ${clubName}. Eligible participants may receive ${event.clubHours.participationHours} verified club hours.`;
  }

  const notification = {
    id: notifId,
    userId: "all_users", // Fallback for old queries if any
    type: "event_published",
    title: "NEW EVENT PUBLISHED",
    message,
    eventId,
    eventTitle: event.title || "",
    clubId: event.clubId || null,
    clubName,
    organizerId: event.creatorId || "",
    createdAt: serverTimestamp(), // Enforce canonical server timestamp
    target: "all_users",
    actionType: "open_event",
    actionPath: `/events/${eventId}`,
    isRead: false // Kept for interface backward compatibility
  };

  try {
    await setDoc(notifRef, notification);
    return notification;
  } catch (error) {
    logFirebaseError("[createEventPublishedNotification] Failed to write event publication notification.", error);
    return null;
  }
};

/**
 * Logs a new user activity timeline action.
 */
export const logActivity = async (userId, action, metadata = {}) => {
  if (!userId) return null;
  const activitiesCol = collection(db, ACTIVITIES_COLLECTION);
  const newDocRef = doc(activitiesCol);

  const activity = {
    id: newDocRef.id,
    userId,
    action,
    createdAt: new Date().toISOString(),
    metadata
  };

  try {
    await setDoc(newDocRef, activity);
    return activity;
  } catch (error) {
    logFirebaseError("[logActivity] Failed to write user activity timeline document.", error);
    return null;
  }
};

/**
 * Marks a single notification as read.
 * Correctly distinguishes between user-specific (isRead = true) and
 * global target notifications (writes user-specific read-state mapping doc).
 */
export const markNotificationAsRead = async (notificationId, userId = null) => {
  if (!notificationId) return;
  const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  try {
    const notifSnap = await getDoc(notifRef);
    if (!notifSnap.exists()) return;

    const notifData = notifSnap.data();

    // Check if notification is a global broadcast
    if (notifData.target === "all_users" || notifData.userId === "all_users") {
      if (userId) {
        const readId = `${userId}_${notificationId}`;
        const readRef = doc(db, NOTIFICATION_READS_COLLECTION, readId);
        await setDoc(readRef, {
          id: readId,
          userId,
          notificationId,
          readAt: new Date().toISOString()
        });
      }
    } else {
      // User-specific notification: update standard isRead boolean
      await updateDoc(notifRef, { isRead: true });
    }
  } catch (error) {
    logFirebaseError("[markNotificationAsRead] Failed to update read flag.", error);
  }
};

/**
 * Marks all unread notifications of a user as read via a Firestore writeBatch.
 * Handles both user-specific unread docs and new global broadcast notifications.
 */
export const markAllNotificationsAsRead = async (userId) => {
  if (!userId) return;
  const notifsCol = collection(db, NOTIFICATIONS_COLLECTION);
  
  // 1. Get all unread user-specific notifications
  const qUser = query(notifsCol, where("userId", "==", userId), where("isRead", "==", false));
  
  // 2. Get all global broadcast notifications
  const qGlobal = query(notifsCol, where("target", "==", "all_users"));

  try {
    const batch = writeBatch(db);
    
    // Process user-specific unread
    const userSnap = await getDocs(qUser);
    userSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, { isRead: true });
    });

    // For global ones, check which ones aren't marked read yet and write mapping doc
    const globalSnap = await getDocs(qGlobal);
    const readsCol = collection(db, NOTIFICATION_READS_COLLECTION);

    for (const docSnap of globalSnap.docs) {
      const notifId = docSnap.id;
      const readId = `${userId}_${notifId}`;
      const readRef = doc(db, readsCol, readId);
      batch.set(readRef, {
        id: readId,
        userId,
        notificationId: notifId,
        readAt: new Date().toISOString()
      });
    }

    await batch.commit();
  } catch (error) {
    logFirebaseError("[markAllNotificationsAsRead] Batch write operation failed.", error);
  }
};

/**
 * Subscribes to real-time notification updates for a user.
 * Combines both user-specific notifications AND global broadcast notifications,
 * mapping read state from the user's notificationReads collection.
 * 
 * Cleans up all listeners on unsubscribe to prevent memory leaks in React StrictMode.
 */
export const subscribeToNotifications = (userId, onUpdate) => {
  if (!userId) return () => {};

  const notifsCol = collection(db, NOTIFICATIONS_COLLECTION);
  const readsCol = collection(db, NOTIFICATION_READS_COLLECTION);

  // 1. User-specific notifications
  const qUser = query(notifsCol, where("userId", "==", userId));
  
  // 2. Global broadcast notifications
  const qGlobal = query(notifsCol, where("target", "==", "all_users"));

  // 3. User's read states
  const qReads = query(readsCol, where("userId", "==", userId));

  let userNotifs = [];
  let globalNotifs = [];
  let readNotifIds = new Set();

  const emitUpdates = () => {
    const combined = [];

    // Helper to safely convert Firebase Timestamp or local optimistic null to ISO string
    const toIsoString = (val) => {
      if (!val) return new Date().toISOString();
      if (typeof val === "string") return val;
      if (val.toDate && typeof val.toDate === "function") {
        return val.toDate().toISOString();
      }
      return new Date().toISOString();
    };

    // User-specific notifications (already filtered to this user)
    userNotifs.forEach((n) => {
      combined.push({
        ...n,
        createdAt: toIsoString(n.createdAt)
      });
    });

    // Global notifications (check if marked read by this user)
    globalNotifs.forEach((n) => {
      combined.push({
        ...n,
        isRead: readNotifIds.has(n.id),
        createdAt: toIsoString(n.createdAt)
      });
    });

    // Sort newest first
    combined.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    onUpdate(combined);
  };

  const unsubUser = onSnapshot(qUser, (snap) => {
    userNotifs = [];
    snap.forEach(docSnap => userNotifs.push(docSnap.data()));
    emitUpdates();
  }, (error) => {
    logFirebaseError("[subscribeToNotifications] User query listener error.", error);
  });

  const unsubGlobal = onSnapshot(qGlobal, (snap) => {
    globalNotifs = [];
    snap.forEach(docSnap => globalNotifs.push(docSnap.data()));
    emitUpdates();
  }, (error) => {
    logFirebaseError("[subscribeToNotifications] Global query listener error.", error);
  });

  const unsubReads = onSnapshot(qReads, (snap) => {
    readNotifIds = new Set();
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.notificationId) {
        readNotifIds.add(data.notificationId);
      }
    });
    emitUpdates();
  }, (error) => {
    logFirebaseError("[subscribeToNotifications] Read-state query listener error.", error);
  });

  // StrictMode safe multiple unsubscriber cleanup
  return () => {
    unsubUser();
    unsubGlobal();
    unsubReads();
  };
};

/**
 * Fetches the user activity logs (max limit items, newest first).
 */
export const getUserActivities = async (userId, limitCount = 20) => {
  if (!userId) return [];
  const activitiesCol = collection(db, ACTIVITIES_COLLECTION);
  const q = query(
    activitiesCol,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  try {
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    logFirebaseError("[getUserActivities] Failed to fetch activity logs.", error);
    return [];
  }
};
