import { collection, doc, getDocs, query, where, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { auth } from "../firebase/config";
import { logFirebaseError } from "../firebase/errorLogging";
import { verifyUserPermission } from "./permissionService";
import { trackEvent } from "./analyticsService";

const COLLECTION_NAME = "organizerInvites";

/**
 * Generates a cryptographically secure random token starting with NEX_
 * minimum 32 random characters (url safe).
 */
export const generateInviteToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint32Array(32);
  // crypto.getRandomValues is standard in modern browsers and node environments
  (window.crypto || window.msCrypto).getRandomValues(array);
  let token = "NEX_";
  for (let i = 0; i < array.length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
};

/**
 * Admin helper: Creates a new invitation token.
 */
export const createInvite = async (clubId, clubName, role = "organizer", expiresInDays = 7) => {
  const { uid: adminUid } = await verifyUserPermission(["admin"]);

  const invitesCol = collection(db, COLLECTION_NAME);
  const newDocRef = doc(invitesCol);
  const token = generateInviteToken();

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiresInDays);

  const inviteData = {
    inviteId: newDocRef.id,
    token,
    clubId: clubId || null,
    clubName: clubName || null,
    role,
    createdBy: adminUid,
    createdAt: new Date().toISOString(),
    expiresAt: expiry.toISOString(),
    used: false,
    usedBy: null,
    usedAt: null,
    maxUses: 1,
    status: "pending"
  };

  try {
    await setDoc(newDocRef, inviteData);
    trackEvent("organizer_invite_created", {
      invite_id: inviteData.inviteId,
      invited_role: inviteData.role,
      invited_club: inviteData.clubName || undefined
    });
    return inviteData;
  } catch (error) {
    logFirebaseError("[createInvite] Failed to create invitation.", error);
    throw error;
  }
};

/**
 * Admin helper: Revokes an active invitation.
 */
export const revokeInvite = async (inviteId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Authentication is required.");

  const inviteRef = doc(db, COLLECTION_NAME, inviteId);
  try {
    await updateDoc(inviteRef, {
      expiresAt: new Date(0).toISOString() // Set expiration to beginning of time
    });
    return true;
  } catch (error) {
    logFirebaseError("[revokeInvite] Failed to revoke invitation.", error);
    throw error;
  }
};

/**
 * Admin helper: Fetches all generated invitations.
 */
export const getInvites = async () => {
  const invitesCol = collection(db, COLLECTION_NAME);
  try {
    const snap = await getDocs(invitesCol);
    const list = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    logFirebaseError("[getInvites] Failed to fetch invitations.", error);
    return [];
  }
};

/**
 * Validates and redeems an invitation token inside a transaction.
 * Updates the user's role and flags the token as used.
 */
export const redeemInviteToken = async (tokenString, userId) => {
  if (!userId) throw new Error("Authentication required.");
  if (!tokenString) throw new Error("Token string is required.");

  const invitesCol = collection(db, COLLECTION_NAME);
  const q = query(invitesCol, where("token", "==", tokenString));



  try {
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Invalid Token: The provided token does not exist in our registry.");
    }

    const inviteDocSnap = snap.docs[0];
    const currentInvite = inviteDocSnap.data();
    const inviteRef = doc(db, COLLECTION_NAME, currentInvite.inviteId);
    const userRef = doc(db, "users", userId);


    const result = await runTransaction(db, async (transaction) => {
      const uDocSnap = await transaction.get(userRef);
      const inviteSnap = await transaction.get(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error("Invalid Token: The invitation record could not be found.");
      }

      const inviteData = inviteSnap.data();

      // Enforce absolute single-use: check used flag and status
      if (inviteData.used === true || (inviteData.status && inviteData.status !== "pending")) {
        throw new Error("Already Used: This invitation has already been redeemed.");
      }

      // Check token expiration/revocation
      const expiry = new Date(inviteData.expiresAt);
      if (expiry < new Date()) {
        throw new Error("Expired Token: This invitation token has expired or has been revoked.");
      }

      if (!uDocSnap.exists()) {
        throw new Error("User record not found.");
      }
      const userData = uDocSnap.data();
      const userRole = (userData.role || "student").toLowerCase().trim();

      if (userRole === "admin") {
        throw new Error("Already Organizer: Admin accounts bypass organizer restrictions.");
      }
      if (userRole === "organizer") {
        throw new Error("Already Organizer: This account is already verified as an organizer.");
      }

      // Mark invitation as consumed (used = true, status = consumed)
      const inviteUpdatePayload = {
        used: true,
        usedBy: userId,
        usedAt: new Date().toISOString(),
        status: "consumed"
      };

      // Upgrade user profile
      const userUpdatePayload = {
        role: inviteData.role || "organizer",
        verified: true,
        clubId: inviteData.clubId,
        clubName: inviteData.clubName,
        appliedInviteId: inviteData.inviteId,
        suspended: false,
        updatedAt: new Date().toISOString()
      };



      transaction.update(inviteRef, inviteUpdatePayload);
      transaction.update(userRef, userUpdatePayload);

      return {
        success: true,
        clubName: inviteData.clubName,
        role: inviteData.role || "organizer"
      };
    });


    trackEvent("organizer_invite_redeemed", {
      invite_id: currentInvite.inviteId,
      granted_role: result.role,
      granted_club: result.clubName || undefined
    });
    return result;
  } catch (error) {
    console.error("[redeemInviteToken] Failed to complete invite redemption transaction.", error);
    logFirebaseError("[redeemInviteToken] Failed to redeem invitation token.", error);
    throw error;
  }
};
