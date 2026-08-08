import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for Firebase to finish restoring the persisted auth session.
  // Without this guard, the route would redirect to /auth/login on every
  // page load before onAuthStateChanged fires with the restored user.
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination so the user is redirected back after login.
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return children;
};
