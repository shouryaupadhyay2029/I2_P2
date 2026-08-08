import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle, 
  logout as firebaseLogout, 
  resetPassword as firebaseResetPassword 
} from '../firebase/auth';

import { checkAndCreateUserProfile, getUser } from '../services/userService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { trackEvent } from '../services/analyticsService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (uid) => {
    const targetUid = uid || (auth.currentUser ? auth.currentUser.uid : null);
    if (targetUid) {
      try {
        const p = await getUser(targetUid);
        if (p && p.role) {
          p.role = p.role.toLowerCase().trim();
        }
        setProfile(p);
        return p;
      } catch (error) {
        console.error("Failed to refresh user profile: ", error);
      }
    }
    return null;
  };

  useEffect(() => {
    // onAuthStateChanged is Firebase's official mechanism for detecting
    // persisted auth sessions. It fires once on initialization — either with
    // a restored user (local persistence) or null (truly logged out).
    //
    // CRITICAL: Do NOT set loading=false here for authenticated users.
    // The profile must be fetched before routes can make access decisions.
    // loading is resolved inside syncProfile (second useEffect below).
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // User is definitively not authenticated — clear profile and unblock routes.
        setProfile(null);
        setLoading(false);
      }
      // When user IS authenticated: loading remains true until syncProfile completes.
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let active = true;
    let unsubscribeProfile = null;

    const syncProfile = async () => {
      try {
        setLoading(true);
        await checkAndCreateUserProfile(currentUser);
        if (!active) return;

        const userRef = doc(db, "users", currentUser.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
          if (active && docSnap.exists()) {
            const data = docSnap.data();
            const profileData = {
              uid: currentUser.uid,
              ...data
            };
            if (profileData.role) {
              profileData.role = profileData.role.toLowerCase().trim();
            }
            setProfile(profileData);
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile snapshot listener error: ", error);
          // A Firestore listener error is NOT an auth error.
          // Preserve the current profile rather than wiping it.
          // Simply stop loading so routes can proceed.
          if (active) {
            setLoading(false);
          }
        });

        if (!active) {
          unsub();
        } else {
          unsubscribeProfile = unsub;
        }
      } catch (error) {
        console.error("Failed to sync user profile with Firestore: ", error);
        if (active) {
          // A profile sync failure (e.g. network offline) must NOT be treated
          // as a logout. The Firebase user is still authenticated.
          // We stop loading without wiping the profile — routes will see
          // isAuthenticated=true with profile=null and can handle that gracefully.
          setLoading(false);
        }
      }
    };

    syncProfile();

    return () => {
      active = false;
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [currentUser]);

  const login = async (email, password) => {
    const result = await signInWithEmail(email, password);
    if (result.user && !result.error) {
      trackEvent("login_success", { method: "email" });
    }
    return result;
  };

  const signup = async (email, password, displayName) => {
    const result = await signUpWithEmail(email, password, displayName);
    if (result.user && !result.error) {
      trackEvent("signup_success", { method: "email" });
    }
    return result;
  };

  const googleLogin = async () => {
    const result = await signInWithGoogle();
    if (result.user && !result.error) {
      trackEvent("login_success", { method: "google" });
    }
    return result;
  };

  const logout = async () => {
    const result = await firebaseLogout();
    if (!result.error) {
      trackEvent("logout");
    }
    return result;
  };

  const resetPassword = async (email) => {
    return firebaseResetPassword(email);
  };

  const value = {
    user: currentUser,
    profile,
    isAuthenticated: !!currentUser,
    loading,
    login,
    signup,
    googleLogin,
    logout,
    resetPassword,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
