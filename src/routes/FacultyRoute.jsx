import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const FacultyRoute = ({ children }) => {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border border-white/20 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const role = (profile?.role || 'student').toLowerCase().trim();
  if (role !== 'faculty' && role !== 'admin') {
    return <Navigate to="/access-required" replace />;
  }

  return children;
};
