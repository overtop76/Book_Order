import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logAction = async (
  user: { uid: string; email: string; name?: string } | null,
  action: string,
  details: string
) => {
  if (!user) return;
  
  try {
    await addDoc(collection(db, 'audit_logs'), {
      timestamp: serverTimestamp(),
      userId: user.uid,
      userEmail: user.email,
      userName: user.name || 'Unknown',
      action,
      details,
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};
