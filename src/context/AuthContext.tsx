import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  programs?: string[];
  grades?: string[];
  subjects?: string[];
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  isEditor: false,
  isViewer: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            // Bootstrap first user or create new user
            const isFirstUser = firebaseUser.email === 'admin@admin.com' || (firebaseUser.email === 'ahmed.g.lotfy76@gmail.com' && firebaseUser.emailVerified);
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: isFirstUser ? 'admin' : 'viewer',
              isActive: isFirstUser ? true : false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newUserData);
            setUserData(newUserData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userData?.role === 'admin' && userData?.isActive;
  const isEditor = userData?.role === 'editor' && userData?.isActive;
  const isViewer = userData?.role === 'viewer' && userData?.isActive;

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, isEditor, isViewer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
