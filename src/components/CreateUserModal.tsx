import React, { useState } from 'react';
import { X, UserPlus, Copy, Check } from 'lucide-react';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [programAccess, setProgramAccess] = useState<string>('ALL');
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const newPassword = customPassword || generatePassword();

    try {
      let secondaryApp;
      try {
        secondaryApp = getApp('SecondaryApp');
      } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      }
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      const newUser = userCredential.user;

      const programs = programAccess === 'ALL' ? [] : [programAccess];

      // Add user to Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        name,
        email,
        role,
        programs,
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // Clean up secondary app
      await deleteApp(secondaryApp);

      setGeneratedPassword(newPassword);
      onUserCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${generatedPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setCustomPassword('');
    setRole('viewer');
    setProgramAccess('ALL');
    setGeneratedPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Create New User
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {generatedPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <h3 className="text-sm font-bold text-green-800 mb-2">User Created Successfully!</h3>
                <p className="text-xs text-green-700 mb-4">Please copy these credentials and share them securely with the user.</p>
                
                <div className="bg-white p-3 rounded-lg border border-green-200 font-mono text-sm space-y-2">
                  <div><span className="text-gray-500">Email:</span> {email}</div>
                  <div><span className="text-gray-500">Password:</span> {generatedPassword}</div>
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
              </button>

              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (Optional)</label>
                <input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer (Read-only / Print)</option>
                  <option value="editor">Editor (Create / Edit Orders / Print)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Access</label>
                <select
                  value={programAccess}
                  onChange={(e) => setProgramAccess(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ALL">All Programs</option>
                  <option value="American">American</option>
                  <option value="British">British</option>
                  <option value="IB">IB</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  You can fine-tune permissions (Grades, Subjects) after creating the user.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors"
                >
                  {loading ? 'Creating User...' : (customPassword ? 'Create User' : 'Create User & Generate Password')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
