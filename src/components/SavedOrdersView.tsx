import React, { useRef, useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { FolderOpen, Trash2, Calendar, FileText, Download, Upload, FileJson, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportOrdersJSON, exportOrdersExcel, importOrdersData } from '../utils/exportImport';

export default function SavedOrdersView({ onOrderLoaded }: { onOrderLoaded: () => void }) {
  const { orders, loadOrder, deleteOrder } = useOrder();
  const { userData } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing data will overwrite existing orders with the same ID and add new ones. Continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const count = await importOrdersData(file);
      alert(`Successfully imported ${count} orders!`);
    } catch (error) {
      console.error("Import error:", error);
      alert('Failed to import data. Please ensure the file is using the correct format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const getExportData = () => {
    if (selectedOrderIds.length > 0) {
      return orders.filter(o => selectedOrderIds.includes(o.id));
    }
    return orders; // default to all if none selected
  };

  return (
    <div className="flex-1 bg-[#f8f9fb] p-8 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Saved Orders ({orders.length})</h2>
            {orders.length > 0 && (
              <button 
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                {selectedOrderIds.length === orders.length ? (
                  <><CheckSquare className="w-4 h-4 text-blue-600" /> Deselect All</>
                ) : (
                  <><Square className="w-4 h-4" /> Select All</>
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json,.xlsx"
              onChange={handleImport}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium rounded-lg transition shadow-sm"
              title="Import Orders"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <div className="flex bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <button 
                onClick={() => exportOrdersJSON(getExportData())}
                disabled={orders.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-gray-300 transition"
                title={`Export ${selectedOrderIds.length > 0 ? selectedOrderIds.length : 'All'} to JSON`}
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm">
                  {selectedOrderIds.length > 0 ? `JSON (${selectedOrderIds.length})` : 'JSON (All)'}
                </span>
              </button>
              <button 
                onClick={() => exportOrdersExcel(getExportData())}
                disabled={orders.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title={`Export ${selectedOrderIds.length > 0 ? selectedOrderIds.length : 'All'} to Excel`}
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm">
                  {selectedOrderIds.length > 0 ? `Excel (${selectedOrderIds.length})` : 'Excel (All)'}
                </span>
              </button>
            </div>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-lg font-medium">No saved orders found.</p>
            <p className="text-sm mt-2 text-gray-400">Save your first order to see it here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map(order => (
              <div 
                key={order.id} 
                className={`bg-white border ${selectedOrderIds.includes(order.id) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'} rounded-xl p-5 flex items-center justify-between shadow-sm hover:border-blue-300 transition group cursor-pointer`}
                onClick={() => handleSelectOrder(order.id)}
              >
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center -ml-2 mr-1">
                    {selectedOrderIds.includes(order.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center ${selectedOrderIds.includes(order.id) ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
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
                    onClick={(e) => {
                        e.stopPropagation();
                        loadOrder(order.id);
                        onOrderLoaded();
                    }}
                    className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg transition shadow-sm"
                  >
                    Load Data
                  </button>
                  {((order.createdBy === userData?.uid && (order.status !== 'Approved' && order.status !== 'Submitted to Vendor')) || userData?.role === 'admin') ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
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
