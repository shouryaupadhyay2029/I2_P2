import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { auth } from "../firebase/config";
import { logFirebaseError } from "../firebase/errorLogging";
import { validateClubHours } from "../utils/clubHours";

const SUBMISSIONS_COLLECTION = "clubHourSubmissions";
const LEDGER_COLLECTION = "clubHourLedger";

/**
 * Checks if a faculty member (or admin) is authorized for a specific club.
 * @param {string} userId - User UID
 * @param {string} clubId - Club ID
 * @returns {Promise<boolean>} True if authorized
 */
export const isFacultyAuthorizedForClub = async (userId, clubId) => {
  if (!userId || !clubId) return false;
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return false;

    const profile = userSnap.data();
    const role = (profile.role || "student").toLowerCase().trim();

    if (role === "admin") return true;
    if (role === "faculty") {
      return Array.isArray(profile.assignedClubIds) && profile.assignedClubIds.includes(clubId);
    }
    return false;
  } catch (error) {
    logFirebaseError("[isFacultyAuthorizedForClub] Error verifying faculty club access.", error);
    return false;
  }
};

/**
 * Fetches a club-hour submission document for an event.
 * @param {string} eventId - Event ID
 * @returns {Promise<object|null>} Submission document data or null
 */
export const getClubHourSubmission = async (eventId) => {
  if (!eventId) return null;
  try {
    const subRef = doc(db, SUBMISSIONS_COLLECTION, `event_${eventId}`);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) return null;
    return subSnap.data();
  } catch (error) {
    logFirebaseError("[getClubHourSubmission] Error fetching submission.", error);
    return null;
  }
};

/**
 * Saves organizer's draft allocations and parent submission.
 * Implements Optimistic Concurrency Control (OCC) based on updatedAt.
 * @param {string} eventId - Event ID
 * @param {Array<object>} allocationsList - List of student allocations
 * @param {object} eventData - Locked Event configuration data
 */
export const saveDraftSubmissions = async (eventId, allocationsList, eventData) => {
  if (!eventId) throw new Error("Invalid event identifier.");
  if (!eventData) throw new Error("Event configuration data is missing.");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be authenticated to perform this operation.");

  const submissionId = `event_${eventId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  // 1. Fetch current document snapshot outside transaction to record last updatedAt for OCC
  const parentSnap = await getDoc(submissionRef);
  const fetchedUpdatedAt = parentSnap.exists()
    ? (parentSnap.data().updatedAt?.toDate ? parentSnap.data().updatedAt.toDate().toISOString() : parentSnap.data().updatedAt)
    : null;

  // Validate standard credit configuration
  const standardHours = eventData.clubHours?.participationHours || 0;
  if (!eventData.clubHours?.enabled || standardHours <= 0) {
    throw new Error("Club credit is not enabled or participation hours are misconfigured for this event.");
  }

  // First, read all current draft allocations to know what to delete
  const allocationsCol = collection(db, SUBMISSIONS_COLLECTION, submissionId, "allocations");
  const currentAllocationsSnap = await getDocs(allocationsCol);
  const currentAllocationDocs = currentAllocationsSnap.docs.map(doc => doc.data());
  const currentAllocationIds = currentAllocationsSnap.docs.map(doc => doc.id);

  const incomingIds = new Set(allocationsList.map(a => a.registrationId));
  const staleIds = currentAllocationIds.filter(id => !incomingIds.has(id));
  const staleAllocations = currentAllocationDocs.filter(d => staleIds.includes(d.registrationId));

  const existingSubmission = parentSnap.exists() ? parentSnap.data() : null;

  if (existingSubmission) {
    if (existingSubmission.status === "pending_faculty") {
      throw new Error("This submission has already been sent to faculty and is locked.");
    }
    // OCC Validation
    const currentUpdatedAt = existingSubmission.updatedAt?.toDate
      ? existingSubmission.updatedAt.toDate().toISOString()
      : existingSubmission.updatedAt;

    if (fetchedUpdatedAt && currentUpdatedAt !== fetchedUpdatedAt) {
      throw new Error("CONCURRENT_EDIT: Draft submission was updated by another coordinator session. Please reload and try again.");
    }
  }
  // Perform transaction to write submission + allocations and delete stale allocations
  await runTransaction(db, async (transaction) => {
    // 1. Check parent submission state and perform OCC check
    const subSnap = await transaction.get(submissionRef);
    const existingSub = subSnap.exists() ? subSnap.data() : null;

    if (existingSub) {
      if (existingSub.status === "pending_faculty") {
        throw new Error("This submission has already been sent to faculty and is locked.");
      }

      // OCC Validation
      const currentUpdatedAt = existingSub.updatedAt?.toDate
        ? existingSub.updatedAt.toDate().toISOString()
        : existingSub.updatedAt;

      if (fetchedUpdatedAt && currentUpdatedAt !== fetchedUpdatedAt) {
        throw new Error("CONCURRENT_EDIT: Draft submission was updated by another coordinator session. Please reload and try again.");
      }
    }

    const currentStatusVal = existingSub?.status || "draft";

    // 2. Read registrations to check eligibility for each allocation
    for (const alloc of allocationsList) {
      const regRef = doc(db, "registrations", alloc.registrationId);
      const regSnap = await transaction.get(regRef);

      if (!regSnap.exists()) {
        throw new Error(`Registration record not found for student ${alloc.studentName || alloc.studentId}.`);
      }

      const regData = regSnap.data();
      if (regData.status !== "confirmed") {
        throw new Error(`Registration for student ${alloc.studentName} is not confirmed.`);
      }

      const isPresent = regData.checkedIn === true || regData.attendanceStatus === "present";
      if (!isPresent) {
        throw new Error(`Student ${alloc.studentName} is not verified present at the event and is ineligible for club credit.`);
      }

      // Validate proposed hours
      const proposed = Number(alloc.proposedHours);
      const valResult = validateClubHours({
        enabled: true,
        participationHours: proposed,
        organizerHours: 0
      });

      if (!valResult.valid) {
        throw new Error(`Allocation for ${alloc.studentName}: ${valResult.error}`);
      }

      const isCustom = proposed !== standardHours;
      if (isCustom) {
        const reason = (alloc.overrideReason || "").trim();
        if (reason.length < 10) {
          throw new Error(`Allocation override for ${alloc.studentName} requires a detailed reason of at least 10 characters.`);
        }
        if (reason.length > 500) {
          throw new Error(`Allocation override for ${alloc.studentName} reason exceeds maximum limit of 500 characters.`);
        }
      }
    }

    // 3. Write submission parent document
    const submissionData = {
      eventId,
      eventTitle: eventData.title || "",
      clubId: eventData.clubId || null,
      clubName: eventData.clubName || null,
      organizerId: existingSub?.organizerId || currentUser.uid,
      status: currentStatusVal, // Keep "returned" or "draft"
      standardParticipationHours: standardHours,
      totalEligibleStudents: allocationsList.length,
      totalSubmittedStudents: allocationsList.length,
      updatedAt: serverTimestamp(),
      ...(existingSub ? {} : { 
        createdAt: serverTimestamp(),
        submittedAt: null,
        submittedBy: null,
        returnedAt: null,
        returnedBy: null,
        returnReason: null
      })
    };

    transaction.set(submissionRef, submissionData, { merge: true });

    // 4. Delete stale allocations & status docs
    for (const alloc of staleAllocations) {
      const staleRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "allocations", alloc.registrationId);
      transaction.delete(staleRef);

      const statusRef = doc(db, "studentCreditStatus", `${alloc.studentId}_${eventId}_participation`);
      transaction.delete(statusRef);
    }

    // 5. Write allocations & status docs
    for (const alloc of allocationsList) {
      const allocRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "allocations", alloc.registrationId);
      const proposed = Number(alloc.proposedHours);
      const isCustom = proposed !== standardHours;

      const allocationData = {
        registrationId: alloc.registrationId,
        studentId: alloc.studentId,
        studentName: alloc.studentName,
        eventId,
        clubId: eventData.clubId || null,
        attendanceVerified: true,
        attendanceStatus: "present",
        standardHours: standardHours,
        proposedHours: proposed,
        allocationType: isCustom ? "custom" : "standard",
        overrideReason: isCustom ? alloc.overrideReason.trim() : null,
        proposedBy: existingSub?.organizerId || currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      transaction.set(allocRef, allocationData);

      // Synchronize studentCreditStatus doc
      const statusId = `${alloc.studentId}_${eventId}_participation`;
      const statusRef = doc(db, "studentCreditStatus", statusId);
      transaction.set(statusRef, {
        studentId: alloc.studentId,
        eventId,
        eventTitle: eventData.title || "",
        clubId: eventData.clubId || null,
        clubName: eventData.clubName || null,
        creditType: "event_participation",
        proposedHours: proposed,
        status: "draft_allocation",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  });
};

/**
 * Submits the event's draft allocations for faculty verification.
 * Runs transactional eligibility and reason checks, and writes an audit log.
 * @param {string} eventId - Event ID
 * @returns {Promise<object>} Result status
 */
export const submitForFacultyVerification = async (eventId) => {
  if (!eventId) throw new Error("Invalid event identifier.");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be authenticated to perform this operation.");

  const submissionId = `event_${eventId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  // Read draft allocations in subcollection first
  const allocationsCol = collection(db, SUBMISSIONS_COLLECTION, submissionId, "allocations");
  const allocationsSnap = await getDocs(allocationsCol);
  
  if (allocationsSnap.empty) {
    throw new Error("No allocations proposed. Please configure and save at least one student allocation.");
  }

  const draftAllocations = allocationsSnap.docs.map(doc => doc.data());

  return await runTransaction(db, async (transaction) => {
    // 1. Fetch parent submission
    const subSnap = await transaction.get(submissionRef);
    if (!subSnap.exists()) {
      throw new Error("Submission draft does not exist.");
    }

    const subData = subSnap.data();
    if (subData.status === "pending_faculty") {
      return { alreadySubmitted: true };
    }

    if (subData.status !== "draft" && subData.status !== "returned") {
      throw new Error("Submission is not in an editable state.");
    }

    // 2. Final verification check: re-read registration document for each allocation
    for (const alloc of draftAllocations) {
      const regRef = doc(db, "registrations", alloc.registrationId);
      const regSnap = await transaction.get(regRef);

      if (!regSnap.exists()) {
        throw new Error(`Registration record no longer exists for student "${alloc.studentName}".`);
      }

      const regData = regSnap.data();
      if (regData.status !== "confirmed") {
        throw new Error(`Registration for student "${alloc.studentName}" is no longer confirmed. Review the highlighted attendee before submitting.`);
      }

      const isPresent = regData.checkedIn === true || regData.attendanceStatus === "present";
      if (!isPresent) {
        throw new Error(`Student "${alloc.studentName}" is no longer attendance eligible. Review the highlighted attendee before submitting.`);
      }
    }

    // 3. Atomically update status to pending_faculty
    transaction.update(submissionRef, {
      status: "pending_faculty",
      submittedAt: serverTimestamp(),
      submittedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    });

    // Synchronize studentCreditStatus docs
    for (const alloc of draftAllocations) {
      const statusRef = doc(db, "studentCreditStatus", `${alloc.studentId}_${eventId}_participation`);
      transaction.update(statusRef, {
        status: "pending_faculty",
        updatedAt: serverTimestamp()
      });
    }

    // 4. Write audit log
    const auditId = `audit_${Date.now()}`;
    const auditRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "audit", auditId);
    transaction.set(auditRef, {
      action: subData.status === "returned" ? "resubmitted" : "submitted",
      actorId: currentUser.uid,
      actorRole: "organizer",
      createdAt: serverTimestamp(),
      metadata: {
        allocationCount: draftAllocations.length
      }
    });

    return { success: true };
  });
};

/**
 * Returns a submission to the organizer for correction.
 * @param {string} eventId - Event ID
 * @param {string} reason - Return reason (justification)
 */
export const returnSubmission = async (eventId, reason) => {
  if (!eventId) throw new Error("Invalid event identifier.");
  
  const sanitizedReason = (reason || "").trim();
  if (sanitizedReason.length < 10) {
    throw new Error("Return reason must be at least 10 characters long.");
  }
  if (sanitizedReason.length > 500) {
    throw new Error("Return reason cannot exceed 500 characters.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be authenticated to perform this operation.");

  const submissionId = `event_${eventId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  const allocationsCol = collection(db, SUBMISSIONS_COLLECTION, submissionId, "allocations");
  const allocationsSnap = await getDocs(allocationsCol);
  const count = allocationsSnap.size;
  const allocationsList = allocationsSnap.docs.map(doc => doc.data());

  await runTransaction(db, async (transaction) => {
    const subSnap = await transaction.get(submissionRef);
    if (!subSnap.exists()) {
      throw new Error("Submission does not exist.");
    }

    const subData = subSnap.data();
    if (subData.status !== "pending_faculty") {
      throw new Error("Submission is not in a pending review state.");
    }

    // Verify faculty club authority
    const userSnap = await transaction.get(doc(db, "users", currentUser.uid));
    if (!userSnap.exists()) throw new Error("User profile not found.");
    const profile = userSnap.data();
    const isFaculty = (profile.role || "").toLowerCase().trim() === "faculty";
    const isAdmin = (profile.role || "").toLowerCase().trim() === "admin";
    
    if (!isAdmin && (!isFaculty || !Array.isArray(profile.assignedClubIds) || !profile.assignedClubIds.includes(subData.clubId))) {
      throw new Error("AUTHORITY_REMOVED: You do not have verification authority for this club.");
    }

    // Update parent submission status to returned
    transaction.update(submissionRef, {
      status: "returned",
      returnedAt: serverTimestamp(),
      returnedBy: currentUser.uid,
      returnReason: sanitizedReason,
      updatedAt: serverTimestamp()
    });

    // Synchronize studentCreditStatus docs
    for (const alloc of allocationsList) {
      const statusRef = doc(db, "studentCreditStatus", `${alloc.studentId}_${eventId}_participation`);
      transaction.update(statusRef, {
        status: "organizer_review",
        updatedAt: serverTimestamp()
      });
    }

    // Write audit log
    const auditId = `audit_${Date.now()}`;
    const auditRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "audit", auditId);
    transaction.set(auditRef, {
      action: "returned",
      actorId: currentUser.uid,
      actorRole: isAdmin ? "admin" : "faculty",
      createdAt: serverTimestamp(),
      reason: sanitizedReason,
      metadata: {
        allocationCount: count
      }
    });
  });
};

/**
 * Approves a submission and atomically creates clubHourLedger records.
 * @param {string} eventId - Event ID
 */
export const approveSubmission = async (eventId) => {
  if (!eventId) throw new Error("Invalid event identifier.");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be authenticated to perform this operation.");

  const submissionId = `event_${eventId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);

  // 1. PRE-TRANSACTION READS
  // We must read allocations before starting the transaction because queries cannot be run inside a transaction
  const allocationsCol = collection(db, SUBMISSIONS_COLLECTION, submissionId, "allocations");
  const allocationsSnap = await getDocs(allocationsCol);
  
  if (allocationsSnap.empty) {
    throw new Error("No allocations proposed. Approval rejected.");
  }

  const draftAllocations = allocationsSnap.docs.map(doc => doc.data());

  // 2. TRANSACTION BLOCK
  return await runTransaction(db, async (transaction) => {
    // A. Read submission
    const subSnap = await transaction.get(submissionRef);
    if (!subSnap.exists()) {
      throw new Error("Submission record does not exist.");
    }

    const subData = subSnap.data();
    if (subData.status === "approved") {
      return { alreadyApproved: true };
    }

    if (subData.status !== "pending_faculty") {
      throw new Error("CONCURRENT_APPROVAL: Submission has already been reviewed or status changed by another session.");
    }

    // B. Verify faculty club authority
    const userSnap = await transaction.get(doc(db, "users", currentUser.uid));
    if (!userSnap.exists()) throw new Error("User profile not found.");
    const profile = userSnap.data();
    const isFaculty = (profile.role || "").toLowerCase().trim() === "faculty";
    const isAdmin = (profile.role || "").toLowerCase().trim() === "admin";
    
    if (!isAdmin && (!isFaculty || !Array.isArray(profile.assignedClubIds) || !profile.assignedClubIds.includes(subData.clubId))) {
      throw new Error("AUTHORITY_REMOVED: Your verification authority for this club is no longer active.");
    }

    // C. Read event document to verify existence
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await transaction.get(eventRef);
    if (!eventSnap.exists()) {
      throw new Error("The associated event could not be found.");
    }

    const eventData = eventSnap.data();
    const standardHours = eventData.clubHours?.participationHours || 0;

    // D. Validate each allocation and corresponding registration
    const ledgerWrites = [];
    for (const alloc of draftAllocations) {
      // Fetch allocation document inside transaction to verify snapshot is accurate
      const allocRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "allocations", alloc.registrationId);
      const transactionAllocSnap = await transaction.get(allocRef);
      if (!transactionAllocSnap.exists()) {
        throw new Error("INVALID_ALLOCATION: A proposed allocation is missing from the submission.");
      }

      // Fetch registration
      const regRef = doc(db, "registrations", alloc.registrationId);
      const regSnap = await transaction.get(regRef);
      if (!regSnap.exists()) {
        throw new Error(`Registration record no longer exists for student "${alloc.studentName}".`);
      }

      const regData = regSnap.data();
      if (regData.status !== "confirmed") {
        throw new Error(`ATTENDANCE_CHANGED: Registration for student "${alloc.studentName}" is no longer confirmed. Review the highlighted attendee before submitting.`);
      }

      const isPresent = regData.checkedIn === true || regData.attendanceStatus === "present";
      if (!isPresent) {
        throw new Error(`ATTENDANCE_CHANGED: Student "${alloc.studentName}" is no longer verified present at the event.`);
      }

      // Verify deterministic ledger entry doesn't exist yet
      const ledgerId = `${alloc.studentId}_${eventId}_participation`;
      const ledgerRef = doc(db, LEDGER_COLLECTION, ledgerId);
      const ledgerSnap = await transaction.get(ledgerRef);
      if (ledgerSnap.exists()) {
        throw new Error(`Duplicate credit: A ledger entry already exists for student "${alloc.studentName}".`);
      }

      // Proposed credit validation
      const proposed = Number(alloc.proposedHours);
      if (proposed <= 0 || proposed > 100 || proposed % 0.5 !== 0) {
        throw new Error(`INVALID_ALLOCATION: Proposed credit of ${proposed} hours for "${alloc.studentName}" is invalid.`);
      }

      const isCustom = proposed !== standardHours;
      if (isCustom) {
        const reason = (alloc.overrideReason || "").trim();
        if (reason.length < 10 || reason.length > 500) {
          throw new Error(`INVALID_ALLOCATION: Override reason for student "${alloc.studentName}" is invalid.`);
        }
      }

      // Push write instructions
      ledgerWrites.push({
        ref: ledgerRef,
        data: {
          studentId: alloc.studentId,
          eventId,
          eventTitle: eventData.title || "",
          clubId: eventData.clubId || null,
          clubName: eventData.clubName || null,
          registrationId: alloc.registrationId,
          creditType: "event_participation",
          hours: proposed,
          attendanceVerified: true,
          sourceSubmissionId: submissionId,
          sourceAllocationId: alloc.registrationId,
          status: "approved",
          proposedBy: subData.organizerId || alloc.proposedBy,
          approvedBy: currentUser.uid,
          proposedAt: alloc.createdAt,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }
      });
    }

    // E. Perform writes
    for (const write of ledgerWrites) {
      transaction.set(write.ref, write.data);
    }

    // Delete corresponding studentCreditStatus records
    for (const alloc of draftAllocations) {
      const statusRef = doc(db, "studentCreditStatus", `${alloc.studentId}_${eventId}_participation`);
      transaction.delete(statusRef);
    }

    // F. Transition submission status to approved
    transaction.update(submissionRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    });

    // G. Write audit log
    const auditId = `audit_${Date.now()}`;
    const auditRef = doc(db, SUBMISSIONS_COLLECTION, submissionId, "audit", auditId);
    transaction.set(auditRef, {
      action: "approved",
      actorId: currentUser.uid,
      actorRole: isAdmin ? "admin" : "faculty",
      createdAt: serverTimestamp(),
      metadata: {
        allocationCount: draftAllocations.length
      }
    });

    return { success: true };
  });
};

/**
 * Fetches all audit logs for a submission.
 * @param {string} eventId - Event ID
 * @returns {Promise<Array<object>>} Audit records list
 */
export const getSubmissionAuditTrail = async (eventId) => {
  if (!eventId) return [];
  try {
    const auditCol = collection(db, SUBMISSIONS_COLLECTION, `event_${eventId}`, "audit");
    const q = query(auditCol, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt
      };
    });
  } catch (error) {
    logFirebaseError("[getSubmissionAuditTrail] Failed to fetch audit logs.", error);
    return [];
  }
};

/**
 * Aggregates a student's total approved hours.
 * @param {string} studentId - Student UID
 * @returns {Promise<Array<object>>} Approved ledger list
 */
export const getStudentApprovedClubHours = async (studentId) => {
  if (!studentId) return [];
  try {
    const q = query(
      collection(db, LEDGER_COLLECTION),
      where("studentId", "==", studentId),
      where("status", "==", "approved")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    logFirebaseError("[getStudentApprovedClubHours] Failed to fetch ledger.", error);
    return [];
  }
};

/**
 * Real-time subscription to derive a student's club hours summaries.
 * @param {string} studentId - Student UID
 * @param {function} onUpdate - Callback receiving summary
 * @returns {function} Unsubscribe callback
 */
export const subscribeToStudentClubHours = (studentId, onUpdate) => {
  if (!studentId) return () => {};

  const q = query(
    collection(db, LEDGER_COLLECTION),
    where("studentId", "==", studentId),
    where("status", "==", "approved")
  );

  return onSnapshot(q, (snap) => {
    let totalApprovedHours = 0;
    let participationHours = 0;
    let organizationHours = 0;
    let approvedRecordCount = 0;

    const records = snap.docs.map(doc => {
      const data = doc.data();
      const hrs = Number(data.hours) || 0;
      totalApprovedHours += hrs;
      if (data.creditType === "event_participation") {
        participationHours += hrs;
      } else if (data.creditType === "event_organization") {
        organizationHours += hrs;
      }
      approvedRecordCount++;
      return {
        ...data,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    onUpdate({
      totalApprovedHours,
      participationHours,
      organizationHours,
      approvedRecordCount,
      records
    });
  }, (err) => {
    logFirebaseError("[subscribeToStudentClubHours] Subscription failed", err);
  });
};

/**
 * Real-time subscription to submissions matching the faculty's assigned club IDs.
 * @param {Array<string>} clubIds - Assigned club IDs
 * @param {string} status - Submission status (e.g. pending_faculty, returned, approved)
 * @param {function} onUpdate - Callback function
 * @returns {function} Unsubscribe callback
 */
export const subscribeToFacultySubmissions = (clubIds, status, onUpdate) => {
  if (!Array.isArray(clubIds) || clubIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  // Firestore "in" queries support arrays up to 10 elements.
  // Standard clubs assigned to a single faculty is usually well below 10.
  const slicedClubIds = clubIds.slice(0, 10);
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where("clubId", "in", slicedClubIds),
    where("status", "==", status)
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt,
        returnedAt: data.returnedAt?.toDate ? data.returnedAt.toDate().toISOString() : data.returnedAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
      };
    });

    // Sort client-side by submittedAt ascending
    list.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeA - timeB;
    });

    onUpdate(list);
  }, (err) => {
    logFirebaseError(`[subscribeToFacultySubmissions] Failed for status ${status}`, err);
  });
};

/**
 * Real-time listener for submission status and allocations subcollection.
 * @param {string} eventId - Event ID
 * @param {function} onUpdate - Callback function receiving update payload
 * @returns {function} Unsubscribe callback
 */
export const subscribeToSubmissionAndAllocations = (eventId, onUpdate) => {
  if (!eventId) return () => {};

  const submissionId = `event_${eventId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  const allocationsCol = collection(db, SUBMISSIONS_COLLECTION, submissionId, "allocations");

  let submissionData = null;
  let allocationsData = [];

  const handleUpdate = () => {
    // Convert Timestamps safely to ISO strings
    const sanitizedSub = submissionData ? {
      ...submissionData,
      createdAt: submissionData.createdAt?.toDate ? submissionData.createdAt.toDate().toISOString() : (submissionData.createdAt || new Date().toISOString()),
      updatedAt: submissionData.updatedAt?.toDate ? submissionData.updatedAt.toDate().toISOString() : (submissionData.updatedAt || new Date().toISOString()),
      submittedAt: submissionData.submittedAt?.toDate ? submissionData.submittedAt.toDate().toISOString() : (submissionData.submittedAt || null),
      returnedAt: submissionData.returnedAt?.toDate ? submissionData.returnedAt.toDate().toISOString() : (submissionData.returnedAt || null),
    } : null;

    const sanitizedAllocations = allocationsData.map(alloc => ({
      ...alloc,
      createdAt: alloc.createdAt?.toDate ? alloc.createdAt.toDate().toISOString() : (alloc.createdAt || new Date().toISOString()),
      updatedAt: alloc.updatedAt?.toDate ? alloc.updatedAt.toDate().toISOString() : (alloc.updatedAt || new Date().toISOString()),
    }));

    onUpdate({ submission: sanitizedSub, allocations: sanitizedAllocations });
  };

  const unsubSub = onSnapshot(submissionRef, (snap) => {
    submissionData = snap.exists() ? snap.data() : null;
    handleUpdate();
  }, (err) => {
    logFirebaseError(`[subscribeToSubmission] Failed`, err);
  });

  const unsubAlloc = onSnapshot(allocationsCol, (snap) => {
    allocationsData = snap.docs.map(doc => doc.data());
    handleUpdate();
  }, (err) => {
    logFirebaseError(`[subscribeToAllocations] Failed`, err);
  });

  return () => {
    unsubSub();
    unsubAlloc();
  };
};
