import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for Firebase auth hydration before rendering or redirecting.
  // This prevents the sign-in page from briefly flashing for authenticated users.
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // If the user was redirected here from a protected route, send them back.
    const intendedDestination = location.state?.from?.pathname || '/';
    return <Navigate to={intendedDestination} replace />;
  }

  return children;
};
