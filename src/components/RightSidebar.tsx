import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Save, Download, FolderOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function RightSidebar() {
  const { books, saveOrder, orders, loadOrder } = useOrder();
  const { userData, isViewer } = useAuth();
  
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [schoolName, setSchoolName] = useState('');
  const [orderName, setOrderName] = useState('');

  const handleSave = async () => {
    if (!orderName) return alert('Please enter an order name');
    await saveOrder(orderName, academicYear, schoolName);
    alert('Order saved successfully!');
  };

  const handleExportExcel = () => {
    if (books.length === 0) return alert('No data to export');
    
    const wb = XLSX.utils.book_new();
    
    const headerData = [
      ['GP Book Order Management System'],
      [`School: ${schoolName || 'N/A'}`, '', '', '', '', `Academic Year: ${academicYear}`],
      [`Prepared by: ${userData?.name || 'Unknown'}`, '', '', '', '', `Date: ${new Date().toLocaleDateString()}`],
      []
    ];

    const colHeaders = ['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Students', 'Projection %', 'Projected', 'Stock', 'Final Order', 'Format', 'Type'];
    
    const dataRows = books.map((b, idx) => [
      idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
      b.nextYearStudents || 0, `${b.projectionPct || 0}%`, b.projectedRequired || 0,
      b.currentStock || 0, b.orderQty || 0, b.format, b.type
    ]);

    const totalRow = [
      '', '', '', '', 'TOTAL', '', '',
      books.reduce((s, b) => s + (b.nextYearStudents || 0), 0),
      '',
      books.reduce((s, b) => s + (b.projectedRequired || 0), 0),
      books.reduce((s, b) => s + (b.currentStock || 0), 0),
      books.reduce((s, b) => s + (b.orderQty || 0), 0),
      '', ''
    ];

    const allData = [...headerData, colHeaders, ...dataRows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(allData);

    ws['!cols'] = [
      { wch: 4 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 16 },
      { wch: 18 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 11 },
      { wch: 10 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Book Orders');
    XLSX.writeFile(wb, `GP-Book-Order-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (books.length === 0) return alert('No data to export');
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 15;

    doc.setFontSize(16);
    doc.text('GP Book Order Management System', margin, margin + 5);
    doc.setFontSize(9);
    doc.text(`School: ${schoolName || 'N/A'}    |    Academic Year: ${academicYear}    |    Prepared by: ${userData?.name || 'Unknown'}    |    Date: ${new Date().toLocaleDateString()}`, margin, margin + 12);

    const headers = [['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Students', 'Proj%', 'Projected', 'Stock', 'Final Order', 'Format', 'Type']];
    const rows = books.map((b, idx) => [
      idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
      b.nextYearStudents || 0, `${b.projectionPct || 0}%`, b.projectedRequired || 0,
      b.currentStock || 0, b.orderQty || 0, b.format, b.type
    ]);

    rows.push([
      '', '', '', '', 'TOTAL', '', '',
      books.reduce((s, b) => s + (b.nextYearStudents || 0), 0),
      '',
      books.reduce((s, b) => s + (b.projectedRequired || 0), 0),
      books.reduce((s, b) => s + (b.currentStock || 0), 0),
      books.reduce((s, b) => s + (b.orderQty || 0), 0),
      '', ''
    ]);

    (doc as any).autoTable({
      head: headers,
      body: rows,
      startY: margin + 16,
      margin: { left: margin, right: margin, bottom: margin },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [43, 76, 126], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 6.5 },
    });

    doc.save(`GP-Book-Order-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalOrder = books.reduce((sum, b) => sum + b.orderQty, 0);

  return (
    <aside className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-blue-50/50">
        <div className="font-bold text-blue-800 text-sm mb-4">Report Settings</div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
            <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">User Name</label>
            <input type="text" value={userData?.name || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">School Name</label>
            <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" placeholder="Enter school name" />
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Export Preview</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{books.length}</div>
            <div className="text-xs text-blue-500">Entries</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-orange-700">{totalOrder}</div>
            <div className="text-xs text-orange-500">Final Order Qty</div>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Save & Export</div>
        <div className="space-y-3">
          {!isViewer && (
            <div>
              <input type="text" value={orderName} onChange={e => setOrderName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 mb-2" placeholder="Order Name (e.g., Fall 2026)" />
              <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition">
                <Save className="w-4 h-4" />
                Save Order to Database
              </button>
            </div>
          )}
          
          <hr className="my-4 border-gray-200" />
          
          <button onClick={handleExportExcel} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-green-300 text-left group">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-sm">Export Excel</div>
            </div>
          </button>
          <button onClick={handleExportPDF} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-red-300 text-left group">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-sm">Export PDF</div>
            </div>
          </button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Load Saved Order</div>
          <div className="space-y-2">
            {orders.map(o => (
              <button 
                key={o.id} 
                onClick={() => loadOrder(o.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-left text-sm text-gray-700"
              >
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
