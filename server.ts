import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin
initializeApp({
  projectId: "gen-lang-client-0049852490"
});

const db = getFirestore();
const auth = getAuth();

async function bootstrapAdmin() {
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'Admin@123';
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'Admin',
        });
        console.log('Created default admin user');
      } else {
        throw e;
      }
    }
    
    // Ensure Firestore record exists
    const userDoc = db.collection('users').doc(userRecord.uid);
    const doc = await userDoc.get();
    if (!doc.exists) {
      await userDoc.set({
        uid: userRecord.uid,
        name: 'Admin',
        email: adminEmail,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      });
      console.log('Created default admin Firestore document');
    }
  } catch (error) {
    console.error('Error bootstrapping admin:', error);
  }
}

async function startServer() {
  await bootstrapAdmin();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Firebase Auth token
  const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const decodedToken = await auth.verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Middleware to check Admin role
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();
      if (userData?.role === 'admin' || ((req as any).user.email === 'ahmed.g.lotfy76@gmail.com' && (req as any).user.email_verified) || (req as any).user.email === 'admin@admin.com') {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // API Routes

  // Auth routes are handled by Firebase Client SDK, but we can provide a health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Users API (Admin only)
  app.get("/api/users", verifyToken, requireAdmin, async (req, res) => {
    try {
      const snapshot = await db.collection('users').get();
      const users = snapshot.docs.map(doc => doc.data());
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put("/api/users/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await db.collection('users').doc(id).update(updates);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.put("/api/users/:id/password", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      await auth.updateUser(id, { password });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update password' });
    }
  });

  app.delete("/api/users/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection('users').doc(id).delete();
      await auth.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Orders API (Handled mostly via Client SDK for real-time, but providing endpoints as requested)
  app.get("/api/orders", verifyToken, async (req, res) => {
    try {
      const snapshot = await db.collection('orders').get();
      const orders = snapshot.docs.map(doc => doc.data());
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
