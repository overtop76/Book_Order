import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { LogOut, Settings, KeyRound } from 'lucide-react';
import LeftSidebar from '../components/LeftSidebar';
import DataTable from '../components/DataTable';
import RightSidebar from '../components/RightSidebar';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useOrder } from '../context/OrderContext';
import SavedOrdersView from '../components/SavedOrdersView';
import { FolderOpen } from 'lucide-react';

export default function Dashboard() {
  const { userData, isAdmin } = useAuth();
  const { isAutoSaving, currentOrder, lastSavedAt, books } = useOrder();
  const [activeTab, setActiveTab] = useState<'entry' | 'review' | 'export' | 'orders'>('entry');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fb] font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-50">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              GP
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">GP Book Order Management</h1>
              <p className="text-xs text-gray-500">Multi-Curriculum Order Management System <span className="text-[9px] text-gray-400 font-medium ml-1">v4.0</span></p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button 
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'entry' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Data Entry
            </button>
            <button 
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'review' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Review
            </button>
            <button 
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'export' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Export
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-blue-700' : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'}`}
            >
              <FolderOpen className="w-4 h-4" />
              Saved Orders
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {(currentOrder || books.length > 0) && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isAutoSaving ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                <div className={`w-2 h-2 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                {isAutoSaving ? 'Saving...' : (lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Auto-saved')}
              </div>
            )}
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{userData?.name}</span> ({userData?.role})
            </div>
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-medium">
                <Settings className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-medium">
              <KeyRound className="w-3.5 h-3.5" />
              Change Password
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition font-medium">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'orders' ? (
          <SavedOrdersView onOrderLoaded={() => setActiveTab('entry')} />
        ) : (
          <>
            {activeTab === 'entry' && <LeftSidebar />}
            <DataTable />
            <RightSidebar activeTab={activeTab} />
          </>
        )}
      </div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}
