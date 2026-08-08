import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle, 
  logout, 
  resetPassword,
  getCurrentUser
} from '../firebase/auth';

/**
 * Authentication Service
 * 
 * This service acts as the interface between the frontend and the backend authentication layer.
 * Currently, it delegates directly to Firebase.
 * In the future, this is where we will integrate with the Express backend to:
 * - Verify Firebase ID Tokens
 * - Create user documents in MongoDB
 * - Fetch user profiles from MongoDB
 */

export const authService = {
  /**
   * Register a new user with email and password
   */
  register: async (email, password, displayName) => {
    const result = await signUpWithEmail(email, password, displayName);
    
    // Future Backend Integration:
    // if (!result.error && result.user) {
    //   const token = await result.user.getIdToken();
    //   await api.post('/api/users/register', { token, displayName, email });
    // }
    
    return result;
  },

  /**
   * Login with email and password
   */
  login: async (email, password) => {
    const result = await signInWithEmail(email, password);
    
    // Future Backend Integration:
    // if (!result.error && result.user) {
    //   const token = await result.user.getIdToken();
    //   await api.post('/api/auth/verify', { token });
    // }
    
    return result;
  },

  /**
   * Login with Google Provider
   */
  loginWithGoogle: async () => {
    const result = await signInWithGoogle();
    
    // Future Backend Integration:
    // if (!result.error && result.user) {
    //   const token = await result.user.getIdToken();
    //   await api.post('/api/auth/google', { token });
    // }
    
    return result;
  },

  /**
   * Logout user
   */
  logout: async () => {
    const result = await logout();
    
    // Future Backend Integration:
    // await api.post('/api/auth/logout');
    
    return result;
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email) => {
    return await resetPassword(email);
  },

  /**
   * Get current user
   */
  getCurrentUser: () => {
    return getCurrentUser();
  }
};
