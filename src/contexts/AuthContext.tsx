import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  getUserProfile,
  UserProfile,
  createOrUpdateUserProfile,
  signInWithGoogle,
  signOutUser
} from '../utils/firebase';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Force sync function to manually sync state with Firebase
  const forceSyncAuthState = async () => {
    const currentUser = auth.currentUser;
    console.log('🔥 Force syncing auth state:', currentUser ? currentUser.email : 'No user');

    if (currentUser) {
      try {
        let profile = await getUserProfile(currentUser.uid);
        if (!profile) {
          console.log('🔥 Creating missing profile...');
          profile = await createOrUpdateUserProfile(currentUser);
        }

        console.log('🔥 Setting user and profile in React state');
        setUser(currentUser);
        setUserProfile(profile);
      } catch (error) {
        console.error('🔥 Error during force sync:', error);
        setUser(currentUser);
        setUserProfile(null);
      }
    } else {
      setUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('🔥 AuthProvider initializing...');
    let mounted = true;

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      console.log('🔥 onAuthStateChanged fired:', user ? user.email : 'No user');

      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile && mounted) {
            console.log('🔥 Creating user profile...');
            profile = await createOrUpdateUserProfile(user);
          }

          if (mounted) {
            console.log('🔥 Setting user in state:', user.email);
            setUser(user);
            setUserProfile(profile);
            console.log('🔥 User state updated successfully');
          }
        } catch (error) {
          console.error('🔥 Profile error:', error);
          if (mounted) {
            setUser(user);
            setUserProfile(null);
          }
        }
      } else {
        if (mounted) {
          console.log('🔥 No user, clearing state');
          setUser(null);
          setUserProfile(null);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    });

    // Additional safety: force sync after 2 seconds if still loading
    const safetySync = setTimeout(() => {
      if (mounted && loading) {
        console.log('🔥 Safety timeout triggered, force syncing...');
        forceSyncAuthState();
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(safetySync);
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      console.log('🔥 Starting sign in...');
      const profile = await signInWithGoogle();

      console.log('🔥 Sign in completed, updating state:', profile.email);
      // Immediately update React state
      setUser(auth.currentUser);
      setUserProfile(profile);

      // Double-check sync after a brief delay
      setTimeout(() => {
        if (auth.currentUser && !user) {
          console.log('🔥 State desync detected, forcing sync...');
          forceSyncAuthState();
        }
      }, 500);

    } catch (error) {
      console.error('🔥 Sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔥 Starting sign out...');
      await signOutUser();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('🔥 Sign out failed:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error('🔥 Refresh profile failed:', error);
      }
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};