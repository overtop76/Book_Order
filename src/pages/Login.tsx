import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const { logAction } = await import('../utils/auditLogger');
        await logAction({ uid: cred.user.uid, email: cred.user.email || '', name: cred.user.displayName || '' }, 'REGISTER', 'User manually registered via login screen');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const { logAction } = await import('../utils/auditLogger');
        await logAction({ uid: cred.user.uid, email: cred.user.email || '', name: cred.user.displayName || '' }, 'LOGIN', 'User logged in successfully');
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is disabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-900 p-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">GP Book Orders</h1>
          <p className="text-blue-200 text-sm">
            {isRegistering ? 'Create a new account' : 'Sign in to manage your orders'}
          </p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {resetMessage && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded-r-lg flex gap-3 items-start">
              <span>{resetMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
                  placeholder="admin@admin.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors"
            >
              {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                disabled={loading}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
