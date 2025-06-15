import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkuxNiFd-RYhiRP5sdvUX557D2DVB9cfI",
  authDomain: "mcpstudio-95485.firebaseapp.com",
  projectId: "mcpstudio-95485",
  storageBucket: "mcpstudio-95485.firebasestorage.app",
  messagingSenderId: "694391069831",
  appId: "1:694391069831:web:b185c8a7e8d42628b4ac22",
  measurementId: "G-SKTTJBYSME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Simple Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Interfaces
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  lastLoginAt: Date;
  projectCount: number;
  usage: {
    endpointsUsed: number;
    serversGenerated: number;
    deploymentsCreated: number;
  };
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  apiSpec?: any;
  endpoints: any[];
  tools: any[];
  resources: any[];
  status: 'draft' | 'active' | 'deployed';
  createdAt: Date;
  updatedAt: Date;
  deploymentUrl?: string;
}

// Simple logging
const log = (message: string, data?: any) => {
  console.log(`🔥 ${message}`, data || '');
};

// SIMPLE sign-in with popup (more reliable than redirect for development)
export const signInWithGoogle = async (): Promise<UserProfile> => {
  try {
    log('Starting Google sign-in with popup...');

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    log('Sign-in successful', { email: user.email });

    // Create or update user profile
    const profile = await createOrUpdateUserProfile(user);
    return profile;

  } catch (error: any) {
    log('Sign-in failed', { code: error.code, message: error.message });

    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by your browser. Please allow popups for this site.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection.');
    }

    throw new Error('Failed to sign in. Please try again.');
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    log('Signing out...');
    await signOut(auth);
    log('Sign out successful');
  } catch (error: any) {
    log('Sign out failed', error);
    throw new Error('Failed to sign out');
  }
};

// Get current user
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Create or update user profile
export const createOrUpdateUserProfile = async (user: User): Promise<UserProfile> => {
  try {
    log('Creating/updating user profile', { email: user.email });

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const now = new Date();

    if (userSnap.exists()) {
      log('Updating existing user');
      const existingData = userSnap.data();
      const updatedProfile: UserProfile = {
        ...existingData,
        lastLoginAt: now,
        displayName: user.displayName || existingData.displayName,
        photoURL: user.photoURL || existingData.photoURL,
      } as UserProfile;

      await setDoc(userRef, updatedProfile, { merge: true });
      log('User profile updated');
      return updatedProfile;
    } else {
      log('Creating new user');
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || undefined,
        plan: 'free',
        createdAt: now,
        lastLoginAt: now,
        projectCount: 0,
        usage: { endpointsUsed: 0, serversGenerated: 0, deploymentsCreated: 0 }
      };

      await setDoc(userRef, newProfile);
      log('New user profile created');
      return newProfile;
    }
  } catch (error: any) {
    log('Failed to create/update user profile', error);
    throw new Error(`Profile operation failed: ${error.message}`);
  }
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    log('Failed to get user profile', error);
    return null;
  }
};

// Legacy functions for compatibility
export const persistentLog = log;
export const getAuthLogs = () => 'Using simplified logging - check console for 🔥 messages';
export const clearAuthLogs = () => console.log('🔥 Logs cleared (using simplified logging)');
export const handleRedirectResult = async () => null; // Not used in popup version

// Project management functions (keeping all existing functions)
export const createProject = async (userId: string, projectData: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const projectRef = doc(collection(db, 'projects'));
    const project: Project = {
      ...projectData,
      id: projectRef.id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(projectRef, project);

    // Update user project count
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await setDoc(userRef, {
        ...userData,
        projectCount: (userData.projectCount || 0) + 1
      }, { merge: true });
    }

    return projectRef.id;
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Project);
  } catch (error) {
    console.error('Failed to get user projects:', error);
    return [];
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await setDoc(projectRef, {
      ...updates,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
};

// Usage tracking
export const trackUsage = async (userId: string, type: 'endpoints' | 'servers' | 'deployments', count: number = 1): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentUsage = userData.usage || { endpointsUsed: 0, serversGenerated: 0, deploymentsCreated: 0 };

      const updatedUsage = {
        ...currentUsage,
        [`${type}Used`]: (currentUsage[`${type}Used`] || 0) + count
      };

      if (type === 'servers') {
        updatedUsage.serversGenerated = (currentUsage.serversGenerated || 0) + count;
      } else if (type === 'deployments') {
        updatedUsage.deploymentsCreated = (currentUsage.deploymentsCreated || 0) + count;
      }

      await setDoc(userRef, { usage: updatedUsage }, { merge: true });
    }
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
};

// Plan limits
export const getPlanLimits = (plan: string) => {
  switch (plan) {
    case 'free':
      return {
        projects: 3,
        endpoints: 10,
        servers: 5,
        deployments: 1
      };
    case 'pro':
      return {
        projects: -1, // unlimited
        endpoints: -1,
        servers: -1,
        deployments: -1
      };
    case 'enterprise':
      return {
        projects: -1,
        endpoints: -1,
        servers: -1,
        deployments: -1
      };
    default:
      return getPlanLimits('free');
  }
};

export const checkPlanLimits = async (userId: string, type: 'projects' | 'endpoints' | 'servers' | 'deployments'): Promise<boolean> => {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) return false;

    const limits = getPlanLimits(userProfile.plan);
    const limit = limits[type];

    if (limit === -1) return true; // unlimited

    if (type === 'projects') {
      return userProfile.projectCount < limit;
    } else {
      const usage = userProfile.usage[`${type}Used`] || 0;
      return usage < limit;
    }
  } catch (error) {
    console.error('Failed to check plan limits:', error);
    return false;
  }
};