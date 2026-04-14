import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!auth.currentUser) return;
    
    try {
      await updatePassword(auth.currentUser, newPassword);
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        onClose();
        setNewPassword('');
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('This operation is sensitive and requires recent authentication. Please log out and log back in before trying again.');
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Change Password</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500" 
            placeholder="New Password (min 6 chars)" 
            required 
            minLength={6} 
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-4 font-medium">{success}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition">Update Password</button>
          </div>
        </form>
      </div>
    </div>
  );
}
