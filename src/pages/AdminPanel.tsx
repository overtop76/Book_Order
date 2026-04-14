import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { KeyRound, Shield } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import UserPermissionsModal from '../components/UserPermissionsModal';
import CreateUserModal from '../components/CreateUserModal';

interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  programs?: string[];
  grades?: string[];
  subjects?: string[];
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (uid: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (window.confirm(`Send password reset email to ${email}?`)) {
      try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('../firebase');
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent successfully!');
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCreateUserModalOpen(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg transition font-medium">
              Create New User
            </button>
            <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg transition font-medium">
              <KeyRound className="w-4 h-4" />
              Change My Password
            </button>
            <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">Back to Dashboard</Link>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.uid}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.uid, e.target.value as any)}
                      disabled={u.uid === user?.uid}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleUserStatus(u.uid, u.isActive)}
                        disabled={u.uid === user?.uid}
                        className={`text-${u.isActive ? 'red' : 'green'}-600 hover:text-${u.isActive ? 'red' : 'green'}-900 disabled:opacity-50`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.email)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => setSelectedUserForPermissions(u)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Permissions
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <CreateUserModal 
        isOpen={isCreateUserModalOpen} 
        onClose={() => setIsCreateUserModalOpen(false)} 
        onUserCreated={fetchUsers} 
      />
      <UserPermissionsModal 
        isOpen={!!selectedUserForPermissions} 
        onClose={() => setSelectedUserForPermissions(null)} 
        user={selectedUserForPermissions} 
        onUpdate={fetchUsers} 
      />
    </div>
  );
}
