import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth, GoogleProvider } from "./config";
import { logFirebaseError } from "./errorLogging";

/**
 * Maps Firebase Auth errors to user-friendly messages
 */
export const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    return { user: userCredential.user, error: null };
  } catch (error) {
    logFirebaseError("[signUpWithEmail] Firebase Auth failed.", error);
    return { user: null, error: getAuthErrorMessage(error.code) };
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    logFirebaseError("[signInWithEmail] Firebase Auth failed.", error);
    return { user: null, error: getAuthErrorMessage(error.code) };
  }
};

export const signInWithGoogle = async () => {
  try {
    const userCredential = await signInWithPopup(auth, GoogleProvider);
    return { user: userCredential.user, error: null };
  } catch (error) {
    logFirebaseError("[signInWithGoogle] Firebase Auth failed.", error);
    return { user: null, error: getAuthErrorMessage(error.code) };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    logFirebaseError("[logout] Firebase Auth failed.", error);
    return { error: getAuthErrorMessage(error.code) };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    logFirebaseError("[resetPassword] Firebase Auth failed.", error);
    return { error: getAuthErrorMessage(error.code) };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};
