import React, { useState, useRef } from 'react';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Save, Download, FolderOpen, FileJson, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RightSidebar() {
  const { 
    books, visibleBooks, setBooks, saveOrder, orders, loadOrder,
    filterProgram, setFilterProgram, filterGrade, setFilterGrade, filterSubject, setFilterSubject,
    viewMode, orderName, setOrderName, academicYear, setAcademicYear, schoolName, setSchoolName, lastSavedAt
  } = useOrder();
  const { userData, isViewer } = useAuth();
  
  const [filterStock, setFilterStock] = useState('all'); // all, in-stock, out-of-stock
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!orderName) return alert('Please enter an order name');
    await saveOrder(orderName, academicYear, schoolName);
    alert('Order saved successfully!');
  };

  const getExportFileName = (ext: string) => {
    const userName = userData?.name ? userData.name.replace(/\s+/g, '_') : 'User';
    const program = filterProgram || 'AllPrograms';
    const date = new Date().toISOString().split('T')[0];
    return `${userName}.${program}.${date}.${ext}`;
  };

  const handleExportExcel = () => {
    const filteredBooks = visibleBooks.filter(b => {
      if (filterProgram && b.program !== filterProgram) return false;
      if (filterGrade && b.grade !== filterGrade) return false;
      if (filterSubject && b.subject !== filterSubject) return false;
      if (filterStock === 'in-stock' && (Number(b.currentStock) || 0) <= 0) return false;
      if (filterStock === 'out-of-stock' && (Number(b.currentStock) || 0) > 0) return false;
      return true;
    });

    if (filteredBooks.length === 0) return alert('No data to export');
    
    const wb = XLSX.utils.book_new();
    
    const headerData = [
      ['GP Book Order Management System'],
      [`School: ${schoolName || 'N/A'}`, '', '', '', '', `Academic Year: ${academicYear}`],
      [`Prepared by: ${userData?.name || 'Unknown'}`, '', '', '', '', `Date: ${new Date().toLocaleDateString()}`],
      []
    ];

    const colHeaders = viewMode === 'stock' 
      ? ['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Current Stock']
      : ['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Students', 'Projection %', 'Projected', 'Stock', 'Final Order', 'Format', 'Type'];
    
    const formatAbbr = (f: string) => f === 'Hard Copy' ? 'HC' : f === 'Digital' ? 'D' : f === 'Both' ? 'B' : f;
    const typeAbbr = (t: string) => t === 'Student Copy' ? 'SC' : t === 'Teacher Edition' ? 'TE' : t === 'Resource Material' ? 'RM' : t;

    const dataRows = filteredBooks.map((b, idx) => {
      if (viewMode === 'stock') {
        return [
          idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
          b.currentStock || 0
        ];
      }
      return [
        idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
        b.nextYearStudents || 0, `${b.projectionPct || 0}%`, b.projectedRequired || 0,
        b.currentStock || 0, b.orderQty || 0, formatAbbr(b.format), typeAbbr(b.type)
      ];
    });

    const totalRow = viewMode === 'stock'
      ? [
          '', '', '', '', 'TOTAL', '', '',
          filteredBooks.reduce((s, b) => s + (Number(b.currentStock) || 0), 0)
        ]
      : [
          '', '', '', '', 'TOTAL', '', '',
          filteredBooks.reduce((s, b) => s + (Number(b.nextYearStudents) || 0), 0),
          '',
          filteredBooks.reduce((s, b) => s + (Number(b.projectedRequired) || 0), 0),
          filteredBooks.reduce((s, b) => s + (Number(b.currentStock) || 0), 0),
          filteredBooks.reduce((s, b) => s + (Number(b.orderQty) || 0), 0),
          '', ''
        ];

    const allData = viewMode === 'stock' 
      ? [...headerData, colHeaders, ...dataRows, totalRow]
      : [...headerData, colHeaders, ...dataRows, totalRow, [], ['Abbreviations: HC = Hard Copy, D = Digital, B = Both | SC = Student Copy, TE = Teacher Edition, RM = Resource Material']];
    const ws = XLSX.utils.aoa_to_sheet(allData);

    ws['!cols'] = viewMode === 'stock'
      ? [
          { wch: 4 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 16 },
          { wch: 18 }, { wch: 10 }
        ]
      : [
          { wch: 4 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 35 }, { wch: 16 },
          { wch: 18 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 11 },
          { wch: 10 }, { wch: 14 }
        ];

    XLSX.utils.book_append_sheet(wb, ws, 'Book Orders');
    XLSX.writeFile(wb, getExportFileName('xlsx'));
  };

  const handleExportPDF = () => {
    const filteredBooks = visibleBooks.filter(b => {
      if (filterProgram && b.program !== filterProgram) return false;
      if (filterGrade && b.grade !== filterGrade) return false;
      if (filterSubject && b.subject !== filterSubject) return false;
      if (filterStock === 'in-stock' && (Number(b.currentStock) || 0) <= 0) return false;
      if (filterStock === 'out-of-stock' && (Number(b.currentStock) || 0) > 0) return false;
      return true;
    });

    if (filteredBooks.length === 0) return alert('No data to export');
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 15;

    doc.setFontSize(16);
    doc.text('GP Book Order Management System', margin, margin + 5);
    doc.setFontSize(9);
    doc.text(`School: ${schoolName || 'N/A'}    |    Academic Year: ${academicYear}    |    Prepared by: ${userData?.name || 'Unknown'}    |    Date: ${new Date().toLocaleDateString()}`, margin, margin + 12);

    const headers = viewMode === 'stock'
      ? [['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Stock']]
      : [['#', 'Program', 'Grade', 'Subject', 'Book Title', 'ISBN', 'Publisher', 'Students', 'Proj%', 'Projected', 'Stock', 'Final Order', 'Format', 'Type']];
    
    const formatAbbr = (f: string) => f === 'Hard Copy' ? 'HC' : f === 'Digital' ? 'D' : f === 'Both' ? 'B' : f;
    const typeAbbr = (t: string) => t === 'Student Copy' ? 'SC' : t === 'Teacher Edition' ? 'TE' : t === 'Resource Material' ? 'RM' : t;

    const rows = filteredBooks.map((b, idx) => {
      if (viewMode === 'stock') {
        return [
          idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
          b.currentStock || 0
        ];
      }
      return [
        idx + 1, b.program, b.grade, b.subject, b.title, b.isbn || '', b.publisher || '',
        b.nextYearStudents || 0, `${b.projectionPct || 0}%`, b.projectedRequired || 0,
        b.currentStock || 0, b.orderQty || 0, formatAbbr(b.format), typeAbbr(b.type)
      ];
    });

    if (viewMode === 'stock') {
      rows.push([
        '', '', '', '', 'TOTAL', '', '',
        filteredBooks.reduce((s, b) => s + (Number(b.currentStock) || 0), 0)
      ]);
    } else {
      rows.push([
        '', '', '', '', 'TOTAL', '', '',
        filteredBooks.reduce((s, b) => s + (Number(b.nextYearStudents) || 0), 0),
        '',
        filteredBooks.reduce((s, b) => s + (Number(b.projectedRequired) || 0), 0),
        filteredBooks.reduce((s, b) => s + (Number(b.currentStock) || 0), 0),
        filteredBooks.reduce((s, b) => s + (Number(b.orderQty) || 0), 0),
        '', ''
      ]);
    }

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: margin + 16,
      margin: { left: margin, right: margin, bottom: margin },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [43, 76, 126], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 6.5 },
    });

    if (viewMode !== 'stock') {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text('Abbreviations: HC = Hard Copy, D = Digital, B = Both | SC = Student Copy, TE = Teacher Edition, RM = Resource Material', margin, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(getExportFileName('pdf'));
  };

  const handleExportJSON = () => {
    if (visibleBooks.length === 0) return alert('No data to export');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(visibleBooks, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", getExportFileName('json'));
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedBooks = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedBooks)) {
          const valid = importedBooks.every(b => b.id && b.title && b.program);
          if (valid) {
            // Keep books that the user doesn't have permission to see
            const hiddenBooks = books.filter(b => !visibleBooks.some(vb => vb.id === b.id));
            setBooks([...hiddenBooks, ...importedBooks]);
            alert('Data imported successfully!');
          } else {
            alert('Invalid JSON format. Missing required fields.');
          }
        }
      } catch (err) {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all books from the current order? This cannot be undone.')) {
      setBooks([]);
    }
  };

  const filteredBooks = books.filter(b => {
    if (filterProgram && b.program !== filterProgram) return false;
    if (filterGrade && b.grade !== filterGrade) return false;
    if (filterSubject && b.subject !== filterSubject) return false;
    if (filterStock === 'in-stock' && (Number(b.currentStock) || 0) <= 0) return false;
    if (filterStock === 'out-of-stock' && (Number(b.currentStock) || 0) > 0) return false;
    return true;
  });

  const totalOrder = filteredBooks.reduce((sum, b) => sum + (Number(b.orderQty) || 0), 0);
  const totalStock = filteredBooks.reduce((sum, b) => sum + (Number(b.currentStock) || 0), 0);

  const CURRICULA: Record<string, { grades: string[], subjects: string[] }> = {
    American: { grades: ['KG1','KG2','G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Social Studies'] },
    British: { grades: ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','IG1','IG2','IG3'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Global Perspective'] },
    IB: { grades: ['PYP1','PYP2','PYP3','PYP4','PYP5','PYP6','PYP7','PYP8','MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','INS (Individuals & Societies)'] }
  };

  const allowedPrograms = userData?.programs?.length ? userData.programs : Object.keys(CURRICULA);
  
  const getFilterGrades = () => {
    if (filterProgram) return CURRICULA[filterProgram]?.grades || [];
    const all = new Set<string>();
    allowedPrograms.forEach(p => CURRICULA[p]?.grades.forEach(g => all.add(g)));
    return Array.from(all);
  };

  const getFilterSubjects = () => {
    if (filterProgram) return CURRICULA[filterProgram]?.subjects || [];
    const all = new Set<string>();
    allowedPrograms.forEach(p => CURRICULA[p]?.subjects.forEach(s => all.add(s)));
    return Array.from(all);
  };

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

      <div className="p-4 border-b border-gray-200 bg-amber-50/50">
        <div className="font-bold text-amber-800 text-sm mb-4">Filter & Preview</div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
            <select 
              value={filterProgram} 
              onChange={e => { setFilterProgram(e.target.value); setFilterGrade(''); setFilterSubject(''); }} 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Programs</option>
              {allowedPrograms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Grade</label>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">All Grades</option>
                {getFilterGrades().map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">All Subjects</option>
                {getFilterSubjects().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Current Stock</label>
              <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock (&gt; 0)</option>
                <option value="out-of-stock">Out of Stock (0)</option>
              </select>
            </div>
          </div>
          <button 
            onClick={() => { setFilterProgram(''); setFilterGrade(''); setFilterSubject(''); setFilterStock('all'); }} 
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-1.5 rounded-lg hover:bg-gray-100 transition border border-gray-200 bg-white"
          >
            ✕ Clear Filters
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Export Preview</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{filteredBooks.length}</div>
          <div className="text-xs text-blue-500">Entries</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-orange-700">{viewMode === 'stock' ? totalStock : totalOrder}</div>
          <div className="text-xs text-orange-500">{viewMode === 'stock' ? 'Total Stock' : 'Final Order Qty'}</div>
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
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={handleExportJSON} className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-medium transition">
              <FileJson className="w-3.5 h-3.5" />
              JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-medium transition">
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} className="hidden" />
          </div>

          {!isViewer && (
            <button onClick={handleClearAll} className="w-full mt-2 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-medium transition">
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          )}
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
