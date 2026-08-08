import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocFromCache } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { logFirebaseError } from "../firebase/errorLogging";
import { logActivity } from "./notificationService";

const COLLECTION_NAME = "users";

export const createUser = async (uid, userData) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  const data = {
    uid,
    suspended: false,
    createdAt: new Date().toISOString(),
    ...userData,
  };
  try {
    await setDoc(userRef, data);
    return data;
  } catch (error) {
    logFirebaseError("[createUser] Failed to create user profile.", error);
    throw error;
  }
};

export const getUser = async (uid) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    logFirebaseError("[getUser] Failed to get user from server, trying cache.", error);
    try {
      const docSnap = await getDocFromCache(userRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (cacheErr) {
      logFirebaseError("[getUser] Cache user get failed.", cacheErr);
    }
  }
  return null;
};

export const updateUser = async (uid, userData) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  const updateData = {
    updatedAt: new Date().toISOString(),
    ...userData,
  };
  try {
    await setDoc(userRef, updateData, { merge: true });
    const updatedSnap = await getDoc(userRef);
    
    // Log activity
    logActivity(uid, "Updated Profile Details");
    
    return updatedSnap.data();
  } catch (error) {
    logFirebaseError("[updateUser] Failed to update user profile.", error);
    throw error;
  }
};

export const deleteUser = async (uid) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.email && data.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com") {
        throw new Error("Action denied: The bootstrap administrator account is protected and cannot be deleted.");
      }
    }
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    logFirebaseError("[deleteUser] Failed to delete user profile.", error);
    throw error;
  }
};

/**
 * Checks if a user profile exists in Firestore and creates it with defaults if not.
 * Safely handles both email signup and Google Sign-in.
 */
export const checkAndCreateUserProfile = async (user) => {
  if (!user) return null;

  const userRef = doc(db, COLLECTION_NAME, user.uid);
  let docSnap = null;
  let fetchedSuccessfully = false;

  try {
    docSnap = await getDoc(userRef);
    fetchedSuccessfully = true;
  } catch (error) {
    logFirebaseError("[checkAndCreateUserProfile] Failed to get user profile from server, trying cache.", error);
    try {
      docSnap = await getDocFromCache(userRef);
      fetchedSuccessfully = true;
    } catch (cacheErr) {
      logFirebaseError("[checkAndCreateUserProfile] Cache user profile get failed.", cacheErr);
    }
  }

  // If both server and cache checks failed (we got errors from both),
  // we CANNOT verify the existence of the document.
  // We must THROW the error and abort to avoid overwriting existing data.
  if (!fetchedSuccessfully) {
    throw new Error("[checkAndCreateUserProfile] Failed to fetch user profile (both network and cache failed). Aborting to prevent accidental profile overwrite.");
  }

  // Now we are certain that docSnap was successfully retrieved.
  // If it does not exist, we initialize it.
  if (!docSnap || !docSnap.exists()) {
    const isPermanentAdmin = user.email && user.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com";
    const defaultProfile = {
      uid: user.uid,
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      avatar: user.photoURL || "",
      college: "",
      branch: "",
      year: "",
      bio: "",
      city: "",
      github: "",
      linkedin: "",
      portfolio: "",
      interests: [],
      role: isPermanentAdmin ? "admin" : "student",
      clubId: null,
      clubName: null,
      verified: isPermanentAdmin ? true : false,
      suspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      // Use merge: true for extra safety to never overwrite pre-existing fields
      await setDoc(userRef, defaultProfile, { merge: true });
    } catch (writeErr) {
      logFirebaseError("[checkAndCreateUserProfile] Failed to write default user profile.", writeErr);
      throw writeErr;
    }
    return defaultProfile;
  }

  const currentData = docSnap.data();
  const isPermanentAdmin = user.email && user.email.toLowerCase().trim() === "upadhyayshourya352@gmail.com";
  if (isPermanentAdmin && (currentData.role !== "admin" || !currentData.verified || currentData.suspended === true)) {
    currentData.role = "admin";
    currentData.verified = true;
    currentData.suspended = false;
    try {
      await updateDoc(userRef, { role: "admin", verified: true, suspended: false });
    } catch (updateErr) {
      logFirebaseError("[checkAndCreateUserProfile] Failed to force admin role.", updateErr);
    }
  }

  const requiredDefaults = {
    bio: "",
    college: "",
    branch: "",
    year: "",
    city: "",
    github: "",
    linkedin: "",
    portfolio: "",
    interests: [],
    avatar: currentData.avatar || currentData.photoURL || user.photoURL || "",
    role: currentData.role || "student",
    clubId: currentData.clubId !== undefined ? currentData.clubId : null,
    clubName: currentData.clubName !== undefined ? currentData.clubName : null,
    verified: currentData.verified !== undefined ? currentData.verified : false,
    suspended: currentData.suspended !== undefined ? currentData.suspended : false,
  };

  let needsUpdate = false;
  const updatedFields = {};

  Object.entries(requiredDefaults).forEach(([key, val]) => {
    if (currentData[key] === undefined) {
      updatedFields[key] = val;
      needsUpdate = true;
    }
  });

  if (needsUpdate) {
    try {
      await updateDoc(userRef, updatedFields);
      return { ...currentData, ...updatedFields };
    } catch (updateErr) {
      logFirebaseError("[checkAndCreateUserProfile] Failed to merge missing fields to user profile.", updateErr);
    }
  }

  return currentData;
};
