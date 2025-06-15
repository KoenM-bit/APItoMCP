import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAuthLogs, clearAuthLogs } from '../utils/firebase';

export const AuthDebug: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState('');

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleShowLogs = () => {
    setLogs(getAuthLogs());
    setShowLogs(true);
  };

  const handleClearLogs = () => {
    clearAuthLogs();
    setLogs('');
    setShowLogs(false);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2 text-yellow-400">Auth Debug</h3>
      <div className="space-y-1 mb-3">
        <div>Loading: <span className={loading ? 'text-red-400' : 'text-green-400'}>{loading ? 'true' : 'false'}</span></div>
        <div>User: <span className={user ? 'text-green-400' : 'text-red-400'}>{user ? `${user.email}` : 'null'}</span></div>
        <div>Profile: <span className={userProfile ? 'text-green-400' : 'text-red-400'}>{userProfile ? `${userProfile.email} (${userProfile.plan})` : 'null'}</span></div>
        <div>URL: {window.location.href}</div>
      </div>

      <div className="space-x-2">
        <button
          onClick={handleShowLogs}
          className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Show Logs
        </button>
        <button
          onClick={handleClearLogs}
          className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Clear Logs
        </button>
      </div>

      {showLogs && (
        <div className="mt-3 p-2 bg-gray-800 rounded max-h-40 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-yellow-400 font-bold">Persistent Logs</span>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <pre className="text-xs whitespace-pre-wrap">{logs || 'No logs available'}</pre>
        </div>
      )}
    </div>
  );
};