import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
            const data = userDoc.data() as UserData;
            
            // Auto-upgrade the main admin if they got stuck
            if ((firebaseUser.email === 'admin@admin.com' || firebaseUser.email === 'ahmed.g.lotfy76@gmail.com') && (!data.isActive || data.role !== 'admin')) {
              const updatedData = { ...data, isActive: true, role: 'admin' as const };
              await updateDoc(userDocRef, { isActive: true, role: 'admin' });
              setUserData(updatedData as UserData);
            } else if (!data.isActive) {
              const { signOut } = await import('firebase/auth');
              await signOut(auth);
              setUserData(null);
              setUser(null);
              alert("Your account has been deactivated by an administrator.");
            } else {
              setUserData(data);
            }
          } else {
            // Bootstrap first user
            const isFirstUser = firebaseUser.email === 'admin@admin.com' || firebaseUser.email === 'ahmed.g.lotfy76@gmail.com';
            
            if (isFirstUser) {
              const newUserData: UserData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin',
                email: firebaseUser.email || '',
                role: 'admin',
                isActive: true,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newUserData);
              setUserData(newUserData);
            } else {
              // User was deleted from the database
              const newUserData: UserData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown user',
                email: firebaseUser.email || '',
                role: 'viewer',
                isActive: false, // Inactive by default
                createdAt: new Date().toISOString(),
              };
              
              try {
                await setDoc(userDocRef, newUserData);
                
                // Add an audit log for restoration
                const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
                await addDoc(collection(db, 'audit_logs'), {
                  timestamp: serverTimestamp(),
                  userId: firebaseUser.uid,
                  userEmail: firebaseUser.email,
                  userName: firebaseUser.displayName || 'Unknown',
                  action: 'USER_RESTORED',
                  details: 'User logged in after being deleted. Account restored as an inactive viewer.',
                });
              } catch (e) {
                console.error("Failed to restore user", e);
              }

              const { signOut } = await import('firebase/auth');
              await signOut(auth);
              setUserData(null);
              setUser(null);
              alert("Your account requires administrator approval. Please contact your admin to restore your access.");
            }
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
