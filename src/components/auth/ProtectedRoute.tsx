import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { user, loading, userProfile } = useAuth();
  const location = useLocation();

  // Show loading screen while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Authenticating...</p>
          <p className="text-xs text-gray-400 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // For routes that require authentication
  if (requireAuth && !user) {
    console.log('🔒 Protected route: Redirecting unauthenticated user to home');
    // Redirect to home page with the current location for redirect after login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // For routes that should only be accessible when NOT authenticated (like login page)
  if (!requireAuth && user) {
    console.log('🔓 Public route: Redirecting authenticated user to dashboard');
    // If user is logged in and trying to access public-only routes, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Additional check: if user exists but profile is missing, handle gracefully
  if (requireAuth && user && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};