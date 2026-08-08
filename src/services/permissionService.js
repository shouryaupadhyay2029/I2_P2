import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { auth } from "../firebase/config";

/**
 * Centralized authorization helper to verify backend permissions.
 * Verifies that the user is authenticated, their profile exists, and their role matches.
 * Returns the verified user ID and user profile data.
 * 
 * @param {string[]} allowedRoles - List of acceptable roles (e.g. ['admin', 'organizer'])
 */
export const verifyUserPermission = async (allowedRoles = []) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("403 Access Required: User is not authenticated.");
  }

  const userDocRef = doc(db, "users", currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    throw new Error("403 Access Required: User profile does not exist.");
  }

  const userProfile = userDoc.data();
  const role = (userProfile.role || "student").toLowerCase().trim();

  if (allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some(r => r.toLowerCase().trim() === role);
    if (!isAllowed) {
      throw new Error(`403 Access Required: Only verified ${allowedRoles.join(" or ")} are allowed to perform this operation.`);
    }
  }

  return {
    uid: currentUser.uid,
    profile: {
      ...userProfile,
      role
    }
  };
};
