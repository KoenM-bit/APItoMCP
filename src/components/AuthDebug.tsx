import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../utils/firebase';

// Temporary debug component - add this to your landing page for testing
export const AuthDebug: React.FC = () => {
  const { user, userProfile, loading } = useAuth();

  const handleShowConsole = () => {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Loading:', loading);
    console.log('User:', user);
    console.log('Profile:', userProfile);
    console.log('Auth current user:', auth.currentUser);
    console.log('=== END DEBUG INFO ===');
  };

  const handleForceReload = () => {
    // Clear any stuck states and reload
    console.log('🔧 Force reloading...');
    window.location.reload();
  };

  const handleClearStorage = () => {
    // Clear localStorage and reload
    console.log('🔧 Clearing storage...');
    localStorage.clear();
    window.location.reload();
  };

  const handleForceSync = () => {
    // Force sync auth state
    console.log('🔧 Attempting to force sync auth state...');
    if (auth.currentUser && !user) {
      console.log('🔧 Detected state desync - Firebase has user but React state does not');
      window.location.reload(); // Quick fix: reload page to re-sync
    } else {
      console.log('🔧 States appear to be in sync');
    }
  };

  // Detect state desync
  const hasDesync = auth.currentUser && !user && !loading;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">🔥 Simple Auth Debug</h3>
      <div className="space-y-1 mb-3">
        <div>Loading: {loading ? '🔴 YES' : '✅ NO'}</div>
        <div>User: {user ? `✅ ${user.email}` : '❌ None'}</div>
        <div>Profile: {userProfile ? `✅ ${userProfile.email}` : '❌ None'}</div>
        <div>Auth State: {auth.currentUser ? '✅ Signed In' : '❌ Signed Out'}</div>
        {hasDesync && (
          <div className="text-red-600 font-bold">⚠️ STATE DESYNC DETECTED!</div>
        )}
      </div>
      <div className="space-y-1">
        <button
          onClick={handleShowConsole}
          className="block w-full text-left text-blue-600 hover:underline"
        >
          Show Debug Info
        </button>
        {hasDesync && (
          <button
            onClick={handleForceSync}
            className="block w-full text-left text-red-600 hover:underline font-bold"
          >
            Fix State Desync
          </button>
        )}
        <button
          onClick={handleClearStorage}
          className="block w-full text-left text-orange-600 hover:underline"
        >
          Clear Storage
        </button>
        <button
          onClick={handleForceReload}
          className="block w-full text-left text-red-600 hover:underline"
        >
          Force Reload
        </button>
      </div>
    </div>
  );
};