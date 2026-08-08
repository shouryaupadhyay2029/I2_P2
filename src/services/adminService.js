import { collection, doc, getDoc, getDocs, setDoc, updateDoc, runTransaction, serverTimestamp, deleteField, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { logFirebaseError } from "../firebase/errorLogging";
import { verifyUserPermission } from "./permissionService";

const CLUBS_COLLECTION = "clubs";
const LOGS_COLLECTION = "adminLogs";
const USERS_COLLECTION = "users";
const EVENTS_COLLECTION = "events";
const REGS_COLLECTION = "registrations";

/**
 * Helper to check if current user is admin.
 */
const verifyAdminAccess = async () => {
  const { uid } = await verifyUserPermission(["admin"]);
  return uid;
};

/**
 * Writes a security audit log to Firestore.
 */
export const writeAuditLog = async (action, actorId, details = {}) => {
  const logsCol = collection(db, LOGS_COLLECTION);
  const newLogRef = doc(logsCol);

  const logData = {
    logId: newLogRef.id,
    action,
    timestamp: new Date().toISOString(),
    actorId,
    details
  };

  try {
    await setDoc(newLogRef, logData);
    return logData;
  } catch (error) {
    console.error("[writeAuditLog] Failed to write audit log document.", error);
    return null;
  }
};

/**
 * Club CRUD Operations
 */
export const createClub = async (clubData) => {
  let adminUid = null;
  let newDocRef = null;
  let club = null;
  let clubWriteSucceeded = false;

  try {
    adminUid = await verifyAdminAccess();

    const clubsCol = collection(db, CLUBS_COLLECTION);
    newDocRef = doc(clubsCol);

    club = {
      clubId: newDocRef.id,
      name: clubData.name || "",
      shortName: clubData.shortName || "",
      description: clubData.description || "",
      logo: clubData.logo || "",
      college: clubData.college || "",
      department: clubData.department || "",
      facultyCoordinator: clubData.facultyCoordinator || "",
      status: clubData.status || "active",
      createdAt: new Date().toISOString(),
      createdBy: adminUid
    };

    await setDoc(newDocRef, club);
    clubWriteSucceeded = true;

    await writeAuditLog("Club Created", adminUid, { clubId: club.clubId, clubName: club.name });

    return club;
  } catch (error) {
    console.error("[createClub] Club registration failed.", {
      phase: !adminUid
        ? "before Firestore club write: verifyAdminAccess"
        : club
          ? clubWriteSucceeded
            ? "after Firestore club write"
            : "during Firestore club write: setDoc"
          : "before Firestore club write: payload preparation",
      adminUid,
      clubWriteSucceeded,
      docPath: newDocRef?.path || null,
      payload: club,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      error,
    });
    logFirebaseError("[createClub] Failed to register club.", error);
    throw error;
  }
};

export const updateClub = async (clubId, clubData) => {
  const adminUid = await verifyAdminAccess();
  const clubRef = doc(db, CLUBS_COLLECTION, clubId);

  const updates = {
    ...clubData,
    updatedAt: new Date().toISOString()
  };

  try {
    await updateDoc(clubRef, updates);
    await writeAuditLog("Club Updated", adminUid, { clubId, name: clubData.name });
    return updates;
  } catch (error) {
    logFirebaseError("[updateClub] Failed to update club document.", error);
    throw error;
  }
};

export const deleteClub = async (clubId) => {
  const adminUid = await verifyAdminAccess();
  const clubRef = doc(db, CLUBS_COLLECTION, clubId);
  try {
    const docSnap = await getDoc(clubRef);
    const name = docSnap.exists() ? docSnap.data().name : clubId;
    await deleteDoc(clubRef);
    await writeAuditLog("Club Deleted", adminUid, { clubId, name });
    return true;
  } catch (error) {
    logFirebaseError("[deleteClub] Failed to delete club document.", error);
    throw error;
  }
};

export const getAllClubs = async () => {
  const clubsCol = collection(db, CLUBS_COLLECTION);
  try {
    const snap = await getDocs(clubsCol);
    const list = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    logFirebaseError("[getAllClubs] Failed to list clubs.", error);
    return [];
  }
};

/**
 * Fetches all registered system users.
 */
export const getAllUsers = async () => {
  await verifyAdminAccess();
  const usersCol = collection(db, USERS_COLLECTION);
  try {
    const snap = await getDocs(usersCol);
    const list = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    logFirebaseError("[getAllUsers] Failed to fetch users.", error);
    return [];
  }
};

/**
 * Updates a user role, logs the action.
 */
export const updateUserRole = async (targetUid, newRole, updates = {}) => {
  const adminUid = await verifyAdminAccess();
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  try {
    const uDoc = await getDoc(userRef);
    const prevData = uDoc.exists() ? uDoc.data() : {};

    if (prevData.email && prevData.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com") {
      throw new Error("Action denied: The bootstrap administrator account is protected and cannot be modified.");
    }

    const fields = {
      role: newRole,
      updatedAt: new Date().toISOString(),
      ...(newRole === "student" ? { assignedClubIds: deleteField(), authorityVersion: deleteField() } : {}),
      ...updates
    };

    await updateDoc(userRef, fields);

    await writeAuditLog("Role Changed", adminUid, {
      targetUid,
      targetEmail: prevData.email || "",
      previousRole: prevData.role || "student",
      newRole
    });

    if (newRole === "student" && prevData.role === "organizer") {
      await writeAuditLog("Organizer Removed", adminUid, {
        targetUid,
        targetEmail: prevData.email || ""
      });
    }

    return true;
  } catch (error) {
    logFirebaseError("[updateUserRole] Failed to modify role.", error);
    throw error;
  }
};

/**
 * Updates suspension status of a user.
 */
export const updateUserSuspension = async (targetUid, suspended) => {
  const adminUid = await verifyAdminAccess();
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  try {
    const uDoc = await getDoc(userRef);
    const prevData = uDoc.exists() ? uDoc.data() : {};

    if (prevData.email && prevData.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com") {
      throw new Error("Action denied: The bootstrap administrator account is protected and cannot be suspended.");
    }

    await updateDoc(userRef, {
      suspended: !!suspended,
      updatedAt: new Date().toISOString()
    });

    await writeAuditLog(suspended ? "User Suspended" : "User Unsuspended", adminUid, {
      targetUid,
      targetEmail: prevData.email || ""
    });

    return true;
  } catch (error) {
    logFirebaseError("[updateUserSuspension] Failed to update user suspension status.", error);
    throw error;
  }
};

/**
 * Fetches security audit logs.
 */
export const getAuditLogs = async (limitCount = 50) => {
  await verifyAdminAccess();
  const logsCol = collection(db, LOGS_COLLECTION);
  const q = query(logsCol, orderBy("timestamp", "desc"), limit(limitCount));
  try {
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    logFirebaseError("[getAuditLogs] Failed to fetch logs.", error);
    return [];
  }
};

export const getAdminStats = async () => {
  await verifyAdminAccess();
  
  let totalUsers = 0;
  let students = 0;
  let organizers = 0;
  let admins = 0;
  let totalClubs = 0;
  let totalEvents = 0;
  let upcomingEvents = 0;
  let registrations = 0;

  // 1. Query Users
  try {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];
    usersSnap.forEach(d => users.push(d.data()));
    totalUsers = users.length;
    students = users.filter(u => (u.role || "").toLowerCase().trim() === "student").length;
    organizers = users.filter(u => (u.role || "").toLowerCase().trim() === "organizer").length;
    admins = users.filter(u => (u.role || "").toLowerCase().trim() === "admin").length;
  } catch (error) {
    console.error("[getAdminStats] users ✗ (Missing or insufficient permissions / query failure):", error);
  }

  // 2. Query Clubs
  try {
    const clubsSnap = await getDocs(collection(db, CLUBS_COLLECTION));
    totalClubs = clubsSnap.size;
  } catch (error) {
    console.error("[getAdminStats] clubs ✗ (Missing or insufficient permissions / query failure):", error);
  }

  // 3. Query Events
  try {
    const eventsSnap = await getDocs(collection(db, EVENTS_COLLECTION));
    totalEvents = eventsSnap.size;
    const todayStr = new Date().toISOString().split("T")[0];
    eventsSnap.forEach((docSnap) => {
      const e = docSnap.data();
      if (e.date && e.date >= todayStr) {
        upcomingEvents++;
      }
    });
  } catch (error) {
    console.error("[getAdminStats] events ✗ (Missing or insufficient permissions / query failure):", error);
  }

  // 4. Query Registrations
  try {
    const regsSnap = await getDocs(collection(db, REGS_COLLECTION));
    registrations = regsSnap.size;
  } catch (error) {
    console.error("[getAdminStats] registrations ✗ (Missing or insufficient permissions / query failure):", error);
  }

  return {
    totalUsers,
    students,
    organizers,
    admins,
    totalClubs,
    totalEvents,
    upcomingEvents,
    registrations
  };
};

/**
 * Subscribes to real-time aggregations of system stats for the Admin Dashboard.
 */
export const subscribeToAdminStats = (onUpdate) => {
  let usersList = [];
  let clubsList = [];
  let eventsList = [];
  let registrationsList = [];

  const checkAndEmit = () => {
    const totalUsers = usersList.length;
    const students = usersList.filter(u => (u.role || "").toLowerCase().trim() === "student").length;
    const organizers = usersList.filter(u => (u.role || "").toLowerCase().trim() === "organizer").length;
    const admins = usersList.filter(u => (u.role || "").toLowerCase().trim() === "admin").length;

    const totalClubs = clubsList.length;

    // Filter out events whose status is "deleted"
    const nonDeletedEvents = eventsList.filter(e => e.status !== "deleted");
    const totalEvents = nonDeletedEvents.length;

    // Upcoming events count should include only: status == "published" && eventDate >= today
    const todayStr = new Date().toISOString().split("T")[0];
    const upcomingEvents = nonDeletedEvents.filter(e => 
      e.status === "published" && e.date && e.date >= todayStr
    ).length;

    const registrations = registrationsList.length;

    onUpdate({
      totalUsers,
      students,
      organizers,
      admins,
      totalClubs,
      totalEvents,
      upcomingEvents,
      registrations
    });
  };

  const unsubUsers = onSnapshot(collection(db, USERS_COLLECTION), (snap) => {
    const list = [];
    snap.forEach(d => list.push(d.data()));
    usersList = list;
    checkAndEmit();
  }, (err) => {
    console.error("[subscribeToAdminStats] users error:", err);
  });

  const unsubClubs = onSnapshot(collection(db, CLUBS_COLLECTION), (snap) => {
    const list = [];
    snap.forEach(d => list.push(d.data()));
    clubsList = list;
    checkAndEmit();
  }, (err) => {
    console.error("[subscribeToAdminStats] clubs error:", err);
  });

  const unsubEvents = onSnapshot(collection(db, EVENTS_COLLECTION), (snap) => {
    const list = [];
    snap.forEach(d => list.push(d.data()));
    eventsList = list;
    checkAndEmit();
  }, (err) => {
    console.error("[subscribeToAdminStats] events error:", err);
  });

  const unsubRegs = onSnapshot(collection(db, REGS_COLLECTION), (snap) => {
    const list = [];
    snap.forEach(d => list.push(d.data()));
    registrationsList = list;
    checkAndEmit();
  }, (err) => {
    console.error("[subscribeToAdminStats] registrations error:", err);
  });

  return () => {
    unsubUsers();
    unsubClubs();
    unsubEvents();
    unsubRegs();
  };
};

/**
 * Faculty Role & Scope Management Operations
 */

/**
 * Activates faculty role for a target student.
 */
export const activateFaculty = async (targetUid, clubIds, expectedAuthorityVersion = 0) => {
  const adminUid = await verifyAdminAccess();
  
  // Normalize club IDs: unique, trim, non-empty
  const cleanClubIds = [...new Set((clubIds || []).map(id => (id || '').trim()).filter(Boolean))];
  
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user profile not found.");
      }
      
      const userData = userSnap.data();
      const targetEmail = (userData.email || "").toLowerCase().trim();
      
      // System Owner Protection check
      if (targetUid === "YsSzEO8nS3UXcr7bv7X2XJ4BaDH3" || targetEmail === "upadhyayshourya352@gmail.com") {
        throw new Error("SYSTEM_OWNER_PROTECTED: The NexEvent System Owner authority cannot be modified.");
      }
      
      const currentRole = (userData.role || "student").toLowerCase().trim();
      if (currentRole === "faculty") {
        throw new Error("ALREADY_FACULTY: This user is already a faculty verifier.");
      }
      if (currentRole === "organizer") {
        throw new Error("ROLE_CONFLICT: This user currently has Organizer authority. Activating Faculty authority would replace their current role.");
      }
      if (currentRole !== "student") {
        throw new Error("INVALID_ROLE_TRANSITION: This account cannot be converted to faculty from its current role.");
      }
      
      // Concurrency check
      const currentVersion = userData.authorityVersion || 0;
      if (currentVersion !== expectedAuthorityVersion) {
        throw new Error("AUTHORITY_CHANGED_CONCURRENTLY: This user's authority changed during your action. Refresh and review the latest state.");
      }
      
      // Validate each club exists and is active
      for (const clubId of cleanClubIds) {
        const clubRef = doc(db, CLUBS_COLLECTION, clubId);
        const clubSnap = await transaction.get(clubRef);
        if (!clubSnap.exists()) {
          throw new Error(`Club "${clubId}" does not exist.`);
        }
        if (clubSnap.data().status !== "active") {
          throw new Error(`Club "${clubSnap.data().name || clubId}" is inactive or archived.`);
        }
      }
      
      // Update user document
      transaction.update(userRef, {
        role: "faculty",
        assignedClubIds: cleanClubIds,
        authorityVersion: currentVersion + 1,
        updatedAt: new Date().toISOString()
      });
      
      // Create role audit record
      const auditCol = collection(db, "roleAudit");
      const auditRef = doc(auditCol);
      transaction.set(auditRef, {
        action: "faculty_activated",
        targetUserId: targetUid,
        actorId: adminUid,
        previousRole: currentRole,
        newRole: "faculty",
        previousAssignedClubIds: [],
        newAssignedClubIds: cleanClubIds,
        createdAt: serverTimestamp()
      });
      
      return true;
    });
  } catch (error) {
    logFirebaseError("[activateFaculty] Failed to activate faculty role.", error);
    throw error;
  }
};

/**
 * Updates the verification scope of an existing faculty member.
 */
export const updateFacultyScope = async (targetUid, clubIds, expectedAuthorityVersion = 0) => {
  const adminUid = await verifyAdminAccess();
  
  // Normalize club IDs: unique, trim, non-empty
  const cleanClubIds = [...new Set((clubIds || []).map(id => (id || '').trim()).filter(Boolean))];
  
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user profile not found.");
      }
      
      const userData = userSnap.data();
      const targetEmail = (userData.email || "").toLowerCase().trim();
      
      if (targetUid === "YsSzEO8nS3UXcr7bv7X2XJ4BaDH3" || targetEmail === "upadhyayshourya352@gmail.com") {
        throw new Error("SYSTEM_OWNER_PROTECTED: The NexEvent System Owner authority cannot be modified.");
      }
      
      const currentRole = (userData.role || "student").toLowerCase().trim();
      if (currentRole !== "faculty") {
        throw new Error("Target user is not a faculty verifier.");
      }
      
      // Concurrency check
      const currentVersion = userData.authorityVersion || 0;
      if (currentVersion !== expectedAuthorityVersion) {
        throw new Error("AUTHORITY_CHANGED_CONCURRENTLY: This user's authority changed during your action. Refresh and review the latest state.");
      }
      
      // Validate each club exists and is active
      for (const clubId of cleanClubIds) {
        const clubRef = doc(db, CLUBS_COLLECTION, clubId);
        const clubSnap = await transaction.get(clubRef);
        if (!clubSnap.exists()) {
          throw new Error(`Club "${clubId}" does not exist.`);
        }
        if (clubSnap.data().status !== "active") {
          throw new Error(`Club "${clubSnap.data().name || clubId}" is inactive or archived.`);
        }
      }
      
      const prevAssignedClubIds = userData.assignedClubIds || [];
      
      // Update user document
      transaction.update(userRef, {
        assignedClubIds: cleanClubIds,
        authorityVersion: currentVersion + 1,
        updatedAt: new Date().toISOString()
      });
      
      // Create role audit record
      const auditCol = collection(db, "roleAudit");
      const auditRef = doc(auditCol);
      transaction.set(auditRef, {
        action: "faculty_scope_updated",
        targetUserId: targetUid,
        actorId: adminUid,
        previousRole: "faculty",
        newRole: "faculty",
        previousAssignedClubIds: prevAssignedClubIds,
        newAssignedClubIds: cleanClubIds,
        createdAt: serverTimestamp()
      });
      
      return true;
    });
  } catch (error) {
    logFirebaseError("[updateFacultyScope] Failed to update faculty scope.", error);
    throw error;
  }
};

/**
 * Revokes faculty authority and demotes back to student.
 */
export const revokeFaculty = async (targetUid, expectedAuthorityVersion = 0) => {
  const adminUid = await verifyAdminAccess();
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  
  try {
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Target user profile not found.");
      }
      
      const userData = userSnap.data();
      const targetEmail = (userData.email || "").toLowerCase().trim();
      
      if (targetUid === "YsSzEO8nS3UXcr7bv7X2XJ4BaDH3" || targetEmail === "upadhyayshourya352@gmail.com") {
        throw new Error("SYSTEM_OWNER_PROTECTED: The NexEvent System Owner authority cannot be modified.");
      }
      
      const currentRole = (userData.role || "student").toLowerCase().trim();
      if (currentRole !== "faculty") {
        throw new Error("Target user is not a faculty verifier.");
      }
      
      // Concurrency check
      const currentVersion = userData.authorityVersion || 0;
      if (currentVersion !== expectedAuthorityVersion) {
        throw new Error("AUTHORITY_CHANGED_CONCURRENTLY: This user's authority changed during your action. Refresh and review the latest state.");
      }
      
      const prevAssignedClubIds = userData.assignedClubIds || [];
      
      // Update user document (role -> student, assignedClubIds -> empty)
      transaction.update(userRef, {
        role: "student",
        assignedClubIds: deleteField(),
        authorityVersion: deleteField(),
        updatedAt: new Date().toISOString()
      });
      
      // Create role audit record
      const auditCol = collection(db, "roleAudit");
      const auditRef = doc(auditCol);
      transaction.set(auditRef, {
        action: "faculty_revoked",
        targetUserId: targetUid,
        actorId: adminUid,
        previousRole: "faculty",
        newRole: "student",
        previousAssignedClubIds: prevAssignedClubIds,
        newAssignedClubIds: [],
        createdAt: serverTimestamp()
      });
      
      return true;
    });
  } catch (error) {
    logFirebaseError("[revokeFaculty] Failed to revoke faculty authority.", error);
    throw error;
  }
};

/**
 * Checks number of pending submissions for a specific club.
 */
export const getPendingSubmissionsCountForClub = async (clubId) => {
  await verifyAdminAccess();
  try {
    const q = query(
      collection(db, "clubHourSubmissions"),
      where("clubId", "==", clubId),
      where("status", "==", "pending_faculty")
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    logFirebaseError("[getPendingSubmissionsCountForClub] Failed to check pending count.", error);
    return 0;
  }
};
