import React from 'react';
import { useOrder } from '../context/OrderContext';
import { FolderOpen, Trash2, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SavedOrdersView({ onOrderLoaded }: { onOrderLoaded: () => void }) {
  const { orders, loadOrder, deleteOrder } = useOrder();
  const { userData } = useAuth();

  return (
    <div className="flex-1 bg-[#f8f9fb] p-8 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Saved Orders ({orders.length})</h2>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-lg font-medium">No saved orders found.</p>
            <p className="text-sm mt-2 text-gray-400">Save your first order to see it here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-blue-300 transition group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex flex-shrink-0 items-center justify-center">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{order.name || 'Unnamed Order'}</h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 mt-1.5">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Academic Year: <span className="font-medium text-gray-700">{order.academicYear || 'N/A'}</span></span>
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> Status: <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">{order.status || 'Draft'}</span></span>
                      <span className="flex items-center gap-1.5">Items: <span className="font-medium text-gray-700">{Array.isArray(order.books) ? order.books.length : JSON.parse(order.books || '[]').length}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                        loadOrder(order.id);
                        onOrderLoaded();
                    }}
                    className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg transition shadow-sm"
                  >
                    Load Data
                  </button>
                  {((order.createdBy === userData?.uid && (order.status !== 'Approved' && order.status !== 'Submitted to Vendor')) || userData?.role === 'admin') ? (
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete "${order.name}"?`)) {
                          deleteOrder(order.id);
                        }
                      }}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Order"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : <div className="w-10"></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
