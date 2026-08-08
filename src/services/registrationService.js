import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  runTransaction,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { logFirebaseError } from "../firebase/errorLogging";
import { createNotification, logActivity } from "./notificationService";
import { getEvent } from "./eventService";
import { resolveEventStatus } from "../utils/eventLifecycle";
import { generatePassToken } from "../utils/passToken";

const COLLECTION_NAME = "registrations";

/**
 * Generates a unique, deterministic ticket ID (display-only, NOT the QR token).
 * This is retained for backward compatibility with existing UI that shows ticketId.
 * DO NOT use this as the QR pass identity — use passToken instead.
 */
export const generateDeterministicTicketId = (userId, eventId) => {
  const seed = `${userId}_${eventId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ticketSuffix = "";
  let temp = Math.abs(hash);
  for (let i = 0; i < 9; i++) {
    ticketSuffix += chars[temp % chars.length];
    temp = Math.floor(temp / chars.length);
  }
  while (ticketSuffix.length < 9) {
    ticketSuffix += "X";
  }
  return `NEX-TKT-${ticketSuffix}`;
};

/**
 * Checks if a user is already registered for a specific event.
 */
export const checkUserRegistration = async (userId, eventId) => {
  if (!userId || !eventId) return false;
  const registrationId = `${userId}_${eventId}`;
  const registrationRef = doc(db, COLLECTION_NAME, registrationId);
  try {
    const docSnap = await getDoc(registrationRef);
    return docSnap.exists() && docSnap.data().status !== "cancelled";
  } catch (error) {
    logFirebaseError("[checkUserRegistration] Error checking registration status.", error);
    return false;
  }
};

/**
 * Registers a user for an event using a Firestore Transaction.
 * Validates authentication, event status, capacity, and duplicate registrations.
 *
 * PASS TOKEN INVARIANT:
 * - passToken is generated ONCE using crypto.randomUUID() inside this transaction.
 * - passToken is persisted in Firestore and NEVER regenerated or overwritten.
 * - The QR pass ALWAYS reads the persisted passToken from Firestore.
 * - No two registration documents can share the same passToken (UUID v4 collision is negligible).
 *
 * IDEMPOTENCY:
 * - Registration document ID = "${userId}_${eventId}" (deterministic).
 * - If the document already exists and is not cancelled, the transaction throws.
 * - Double-click, rapid retry, or repeated calls cannot create duplicate registrations.
 */
export const registerForEvent = async (userId, eventId) => {
  if (!userId) throw new Error("You must be logged in to register.");
  if (!eventId) throw new Error("Invalid event identifier.");

  const registrationId = `${userId}_${eventId}`;
  const registrationRef = doc(db, COLLECTION_NAME, registrationId);
  const eventRef = doc(db, "events", eventId);
  const userRef = doc(db, "users", userId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Fetch event and registration document
      const eventSnap = await transaction.get(eventRef);
      const registrationSnap = await transaction.get(registrationRef);
      const userSnap = await transaction.get(userRef);

      if (!eventSnap.exists()) {
        throw new Error("This event could not be found.");
      }

      const eventData = eventSnap.data();
      const userProfile = userSnap.exists() ? userSnap.data() : {};
      const userRole = (userProfile.role || "student").toLowerCase().trim();

      // Organizers cannot register for their own events
      if (userRole === "organizer" && eventData.creatorId === userId) {
        throw new Error("Organizers cannot register for their own events.");
      }

      // Admins may register only if explicitly allowed by configuration
      const ALLOW_ADMIN_REGISTRATION = import.meta.env.VITE_ALLOW_ADMIN_REGISTRATION === 'true';
      if (userRole === "admin" && !ALLOW_ADMIN_REGISTRATION) {
        throw new Error("Admin registration is disabled by configuration.");
      }

      // 2. Validate user registration status (exclude cancelled ones)
      if (registrationSnap.exists() && registrationSnap.data().status !== "cancelled") {
        throw new Error("You are already registered for this event.");
      }

      // 3. Validate event registration status is open/published
      const resolvedStatus = resolveEventStatus(eventData);
      if (resolvedStatus === "archived" || eventData.status === "archived") {
        throw new Error("Registration blocked: Event is archived.");
      }
      if (resolvedStatus === "cancelled" || eventData.status === "cancelled") {
        throw new Error("Registration blocked: Event has been cancelled.");
      }
      if (resolvedStatus === "deleted" || eventData.status === "deleted") {
        throw new Error("Registration blocked: Event is deleted.");
      }
      if (resolvedStatus === "completed" || eventData.status === "completed") {
        throw new Error("Registration blocked: Event is completed.");
      }

      // 4. Validate registration deadline
      const today = new Date().toISOString().split("T")[0];
      if (eventData.registrationDeadline && today > eventData.registrationDeadline) {
        throw new Error("Registration blocked: The registration deadline has passed.");
      }

      // 5. Validate seat capacity
      const capacity = parseInt(eventData.capacity) || 0;
      const currentRegistered = parseInt(eventData.registeredCount) || 0;
      if (currentRegistered >= capacity) {
        throw new Error("Registration blocked: Event capacity is full.");
      }

      // 6. Build registration document
      // ticketId: deterministic display ID (kept for UI backward compat)
      const ticketId = generateDeterministicTicketId(userId, eventId);
      // ticketQR: legacy QR payload (kept for backward compat with existing scanners)
      const ticketQR = JSON.stringify({ ticketId, eventId, userId });

      // passToken: cryptographically random, unique QR identity — generated ONCE here
      // NEVER regenerated after creation. NEVER exposed as userId/eventId.
      // Format: nxp_<UUID-v4>
      const passToken = generatePassToken();

      // passQR: new secure QR payload using persisted passToken only
      const passQR = JSON.stringify({
        v: 1,
        type: "nexevent_pass",
        token: passToken
      });

      const registrationData = {
        registrationId,
        eventId,
        eventTitle: eventData.title || "",
        userId,
        userName: userProfile.displayName || userProfile.email || "Unknown Student",
        userEmail: userProfile.email || "",
        // Snapshot additional profile fields for robust attendee registry hydration
        studentName: userProfile.displayName || userProfile.email || "Unknown Student",
        email: userProfile.email || "",
        college: userProfile.college || "N/A",
        branch: userProfile.department || userProfile.branch || "N/A",
        avatar: userProfile.avatar || "",
        clubId: eventData.clubId || null,
        organizerId: eventData.creatorId || "",
        registeredAt: new Date().toISOString(),
        status: "confirmed",
        // Legacy fields (backward compat)
        ticketId,
        ticketQR,
        // New pass token fields (production identity)
        passToken,
        passQR,
        // Attendance fields
        attendanceStatus: "pending",
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      };

      // 7. Write registration and update event count
      transaction.set(registrationRef, registrationData);

      const newRegisteredCount = currentRegistered + 1;
      const updateData = {
        registeredCount: newRegisteredCount,
        updatedAt: new Date().toISOString()
      };

      // If capacity reached, close the registration
      if (newRegisteredCount >= capacity) {
        updateData.status = "closed";
      }

      // Lock club hours configuration on the first registration
      if (currentRegistered === 0 && eventData.clubHours?.enabled === true && eventData.clubHoursLocked !== true) {
        updateData.clubHoursLocked = true;
        updateData.clubHoursLockedAt = new Date().toISOString();
      }

      transaction.update(eventRef, updateData);

      return {
        registration: registrationData,
        newRegisteredCount,
        newStatus: updateData.status || eventData.status,
        eventTitle: eventData.title || "Event",
        eventCategory: eventData.category || "General"
      };
    });

    // Send notifications and log activity after successful transaction
    createNotification(
      userId,
      "registration_success",
      "Registration Successful",
      `You are now registered for the event: "${result.eventTitle}".`,
      eventId,
      { category: result.eventCategory }
    );

    logActivity(
      userId,
      `Registered for ${result.eventCategory || 'Event'}: "${result.eventTitle}"`,
      { eventId }
    );

    return result;
  } catch (error) {
    logFirebaseError("[registerForEvent] Registration transaction failed.", error);
    throw error;
  }
};

/**
 * Cancels a user registration. Soft cancels by setting status = 'cancelled'.
 * IMPORTANT: NEVER overwrites passToken during cancellation.
 */
export const cancelRegistration = async (registrationId, actorRole = "student") => {
  const docRef = doc(db, COLLECTION_NAME, registrationId);
  const [userId, eventId] = registrationId.split('_');
  const eventRef = doc(db, "events", eventId);

  try {
    const event = await getEvent(eventId);
    if (!event) throw new Error("Event not found.");

    if (actorRole === "student") {
      const today = new Date().toISOString().split("T")[0];
      if (event.registrationDeadline && today > event.registrationDeadline) {
        throw new Error("You cannot cancel registration after the registration deadline has passed.");
      }
    }

    const result = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(docRef);
      if (!regSnap.exists()) return false;
      const regData = regSnap.data();

      // If already cancelled, do nothing
      if (regData.status === "cancelled") {
        return false;
      }

      const eventSnap = await transaction.get(eventRef);
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const currentCount = parseInt(eventData.registeredCount) || 0;
        const newCount = Math.max(currentCount - 1, 0);

        const updateData = {
          registeredCount: newCount,
          updatedAt: new Date().toISOString()
        };

        // Reopen registrations if we fall below capacity limit
        if ((eventData.status === 'closed' || eventData.status === 'open' || eventData.status === 'published') && newCount < (parseInt(eventData.capacity) || 0)) {
          updateData.status = 'published';
        }

        transaction.update(eventRef, updateData);
      }

      // Soft cancel — passToken is intentionally NOT touched
      transaction.update(docRef, {
        status: "cancelled",
        updatedAt: new Date().toISOString()
        // passToken: NEVER OVERWRITTEN HERE
      });
      return true;
    });

    if (event) {
      logActivity(
        userId,
        `Cancelled Registration for ${event.category || 'Event'}: "${event.title}"`,
        { eventId }
      );
    } else {
      logActivity(userId, `Cancelled Registration`, { eventId });
    }
    return result;
  } catch (error) {
    logFirebaseError("[cancelRegistration] Failed to cancel registration transaction.", error);
    throw error;
  }
};

/**
 * Checks in an attendee for a registration event by document lookup.
 * Used by organizer for manual check-in (not QR scan).
 */
export const checkInAttendee = async (userId, eventId, actorId) => {
  const registrationId = `${userId}_${eventId}`;
  const regRef = doc(db, COLLECTION_NAME, registrationId);
  try {
    await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error("Registration Not Found.");
      }
      const regData = regSnap.data();
      if (regData.checkedIn || regData.attendanceStatus === "present") {
        throw new Error("Already Checked In: Attendee has already checked in.");
      }
      transaction.update(regRef, {
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: actorId,
        attendanceStatus: "present"
      });
    });
    return true;
  } catch (error) {
    logFirebaseError("[checkInAttendee] Failed to check in attendee.", error);
    throw error;
  }
};

/**
 * Validates ticket and marks attendee present. Prevents double check-in.
 * Legacy QR scan path (uses userId + eventId + ticketId from old QR format).
 */
export const checkInByTicket = async (userId, eventId, ticketId, actorId) => {
  if (!userId || !eventId || !ticketId) {
    throw new Error("Invalid scan: Missing scan parameter context.");
  }
  const registrationId = `${userId}_${eventId}`;
  const regRef = doc(db, COLLECTION_NAME, registrationId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error("UNKNOWN_TOKEN: Registration not found in registry.");
      }

      const regData = regSnap.data();
      if (regData.ticketId !== ticketId) {
        throw new Error("INVALID_REGISTRATION: Ticket ID mismatch.");
      }

      if (regData.eventId !== eventId) {
        throw new Error("WRONG_EVENT: Ticket does not belong to this event.");
      }

      if (regData.status === "cancelled") {
        throw new Error("CANCELLED_PASS: Registration has been cancelled.");
      }

      if (regData.checkedIn || regData.attendanceStatus === "present") {
        throw new Error("ALREADY_CHECKED_IN: Attendee has already checked in.");
      }

      const checkInFields = {
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: actorId,
        attendanceStatus: "present"
      };

      transaction.update(regRef, checkInFields);
      return { ...regData, ...checkInFields };
    });

    return result;
  } catch (error) {
    logFirebaseError("[checkInByTicket] Check-in transaction failed.", error);
    throw error;
  }
};

/**
 * PRIMARY QR SCAN PATH — Check in by passToken.
 *
 * Resolves a scanned passToken to a single registration document using a
 * Firestore collection query. Then validates:
 * 1. Token exists (UNKNOWN_TOKEN)
 * 2. Registration belongs to the scanned event (WRONG_EVENT)
 * 3. Registration status is not cancelled (CANCELLED_PASS)
 * 4. Attendee has not already checked in (ALREADY_CHECKED_IN)
 * 5. Atomically marks attendee as present (concurrent check-in safe)
 *
 * @param {string} passToken - The "nxp_<UUID>" token from the scanned QR
 * @param {string} scannerEventId - The eventId the organizer is scanning for
 * @param {string} actorId - The organizer's userId performing the scan
 */
export const checkInByPassToken = async (passToken, scannerEventId, actorId) => {
  if (!passToken || !scannerEventId || !actorId) {
    throw new Error("MALFORMED_QR: Missing required scan parameters.");
  }

  // Validate token format prefix
  if (!passToken.startsWith("nxp_")) {
    throw new Error("MALFORMED_QR: Invalid token format.");
  }

  try {
    // Step 1: Find registration by passToken under the specific scanned event
    const registrationsCol = collection(db, COLLECTION_NAME);
    const q = query(
      registrationsCol,
      where("eventId", "==", scannerEventId),
      where("passToken", "==", passToken)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("UNKNOWN_TOKEN: No registration found for this pass token.");
    }

    // There should be exactly one match (UUID uniqueness guarantees this)
    const regDocSnap = querySnapshot.docs[0];
    const regRef = regDocSnap.ref;

    // Step 2: Atomic check-in transaction
    const result = await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(regRef);
      if (!freshSnap.exists()) {
        throw new Error("UNKNOWN_TOKEN: Registration document no longer exists.");
      }

      const regData = freshSnap.data();

      // Validate event match (prevents Event A pass from checking into Event B)
      if (regData.eventId !== scannerEventId) {
        throw new Error("WRONG_EVENT: This pass belongs to a different event.");
      }

      // Validate registration is not cancelled
      if (regData.status === "cancelled") {
        throw new Error("CANCELLED_PASS: This registration has been cancelled.");
      }

      // Validate not already checked in (concurrent duplicate scan protection)
      if (regData.checkedIn || regData.attendanceStatus === "present") {
        throw new Error("ALREADY_CHECKED_IN: Attendee has already been checked in.");
      }

      const checkInFields = {
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        checkedInBy: actorId,
        attendanceStatus: "present"
      };

      transaction.update(regRef, checkInFields);
      return { ...regData, ...checkInFields };
    });

    return result;
  } catch (error) {
    logFirebaseError("[checkInByPassToken] Pass token check-in failed.", error);
    throw error;
  }
};

/**
 * Fetches a single registration document by its passToken.
 * Used for pass verification without triggering check-in.
 *
 * @param {string} passToken - The "nxp_<UUID>" token
 * @returns {object|null} The registration document data or null if not found
 */
export const getRegistrationByPassToken = async (passToken) => {
  if (!passToken) return null;
  try {
    const registrationsCol = collection(db, COLLECTION_NAME);
    const q = query(registrationsCol, where("passToken", "==", passToken));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data();
  } catch (error) {
    logFirebaseError("[getRegistrationByPassToken] Lookup failed.", error);
    return null;
  }
};

/**
 * Subscribes to real-time registrations for a specific event (active confirmed ones only).
 */
export const subscribeToEventRegistrations = (eventId, onUpdate) => {
  const registrationsCol = collection(db, COLLECTION_NAME);
  const q = query(registrationsCol, where("eventId", "==", eventId), where("status", "==", "confirmed"));
  return onSnapshot(q, async (querySnapshot) => {
    const list = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data());
    });

    const resolved = await Promise.all(list.map(async (reg) => {
      try {
        const uDoc = await getDoc(doc(db, "users", reg.userId));
        const uData = uDoc.exists() ? uDoc.data() : {};
        return {
          ...reg,
          studentName: uData.displayName || reg.studentName || reg.userName || "Unknown Student",
          email: uData.email || reg.email || reg.userEmail || "",
          college: uData.college || reg.college || "N/A",
          branch: uData.department || uData.branch || reg.branch || "N/A",
          avatar: uData.avatar || reg.avatar || ""
        };
      } catch (e) {
        logFirebaseError("[subscribeToEventRegistrations] User profile fetch failed, using registration snapshots", e);
        return {
          ...reg,
          studentName: reg.studentName || reg.userName || "Unknown Student",
          email: reg.email || reg.userEmail || "",
          college: reg.college || "N/A",
          branch: reg.branch || "N/A",
          avatar: reg.avatar || ""
        };
      }
    }));

    onUpdate(resolved);
  }, (error) => {
    logFirebaseError("[subscribeToEventRegistrations] Error in registration stream.", error);
  });
};

export const getUserRegistrations = async (userId) => {
  const registrationsCol = collection(db, COLLECTION_NAME);
  const q = query(registrationsCol, where("userId", "==", userId));
  try {
    const querySnapshot = await getDocs(q);
    const registrations = [];
    querySnapshot.forEach((doc) => {
      registrations.push(doc.data());
    });
    return registrations;
  } catch (error) {
    logFirebaseError("[getUserRegistrations] Failed to fetch user registrations.", error);
    throw error;
  }
};

export const getEventRegistrations = async (eventId) => {
  const registrationsCol = collection(db, COLLECTION_NAME);
  const q = query(registrationsCol, where("eventId", "==", eventId));
  try {
    const querySnapshot = await getDocs(q);
    const registrations = [];
    querySnapshot.forEach((doc) => {
      registrations.push(doc.data());
    });
    return registrations;
  } catch (error) {
    logFirebaseError("[getEventRegistrations] Failed to fetch event registrations.", error);
    throw error;
  }
};

/**
 * MIGRATION: Add passToken to existing registrations that do not have one.
 *
 * Safety guarantees:
 * - Reads each registration doc before writing.
 * - Only writes passToken if it does NOT already exist (idempotent).
 * - NEVER overwrites an existing passToken value.
 * - Uses Firestore batch writes (up to 500 per batch).
 * - Safe to run multiple times — subsequent runs are no-ops.
 * - NOT called automatically on page load — must be triggered explicitly by admin.
 *
 * @returns {{ total: number, migrated: number, skipped: number }}
 */
export const migratePassTokens = async () => {
  const registrationsCol = collection(db, COLLECTION_NAME);
  try {
    const allDocs = await getDocs(registrationsCol);
    let total = 0;
    let migrated = 0;
    let skipped = 0;

    const docsNeedingToken = [];
    allDocs.forEach((docSnap) => {
      total++;
      const data = docSnap.data();
      // Only migrate docs that are missing passToken
      if (!data.passToken || typeof data.passToken !== "string" || !data.passToken.startsWith("nxp_")) {
        docsNeedingToken.push(docSnap.ref);
      } else {
        skipped++;
      }
    });

    // Process in batches of 499 (Firestore limit is 500 per batch)
    const BATCH_SIZE = 499;
    for (let i = 0; i < docsNeedingToken.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const slice = docsNeedingToken.slice(i, i + BATCH_SIZE);
      for (const ref of slice) {
        const freshSnap = await getDoc(ref);
        if (!freshSnap.exists()) continue;
        const freshData = freshSnap.data();
        // Double-check: still missing passToken (another migration may have run concurrently)
        if (!freshData.passToken || !freshData.passToken.startsWith("nxp_")) {
          const newToken = generatePassToken();
          const newPassQR = JSON.stringify({ v: 1, type: "nexevent_pass", token: newToken });
          batch.update(ref, {
            passToken: newToken,
            passQR: newPassQR,
            migratedAt: new Date().toISOString()
          });
          migrated++;
        } else {
          skipped++;
        }
      }
      await batch.commit();
    }

    return { total, migrated, skipped };
  } catch (error) {
    logFirebaseError("[migratePassTokens] Migration failed.", error);
    throw error;
  }
};
