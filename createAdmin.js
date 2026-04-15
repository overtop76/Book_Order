import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, 'admin@admin.com', 'Admin@1234');
    const user = userCredential.user;
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: 'Admin',
      email: 'admin@admin.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    });
    console.log('Admin created successfully');
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin already exists');
    } else {
      console.error('Error creating admin:', error);
    }
  }
  process.exit(0);
}

createAdmin();
