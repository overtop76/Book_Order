import React, { useState } from 'react';
import { useOrder, Book } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Copy, Edit2 } from 'lucide-react';
import EditBookModal from './EditBookModal';

export default function DataTable() {
  const { books, setBooks, filterProgram, setFilterProgram, filterGrade, setFilterGrade, filterSubject, setFilterSubject, groupBy, setGroupBy } = useOrder();
  const { userData, isViewer } = useAuth();
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [filterStock, setFilterStock] = useState('all'); // all, in-stock, out-of-stock
  const [editingBook, setEditingBook] = useState<Book | null>(null);

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

  const filteredBooks = books.filter(b => {
    if (filterProgram && b.program !== filterProgram) return false;
    if (filterGrade && b.grade !== filterGrade) return false;
    if (filterSubject && b.subject !== filterSubject) return false;
    if (filterStock === 'in-stock' && (Number(b.currentStock) || 0) <= 0) return false;
    if (filterStock === 'out-of-stock' && (Number(b.currentStock) || 0) > 0) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      setBooks(books.filter(b => b.id !== id));
    }
  };

  const handleDuplicate = (book: Book) => {
    const newBook = { ...book, id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: `${book.title} (Copy)` };
    setBooks([...books, newBook]);
  };

  const handleUpdateBook = (id: string, field: keyof Book, value: number) => {
    setBooks(books.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b, [field]: value };
      // Recalculate projected and orderQty
      updated.projectedRequired = Math.ceil(updated.nextYearStudents + (updated.nextYearStudents * updated.projectionPct / 100));
      updated.orderQty = Math.max(0, updated.projectedRequired - updated.currentStock);
      return updated;
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedBooks(prev => 
      prev.includes(id) ? prev.filter(bookId => bookId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedBooks.length === filteredBooks.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(filteredBooks.map(b => b.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedBooks.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedBooks.length} selected books?`)) {
      setBooks(books.filter(b => !selectedBooks.includes(b.id)));
      setSelectedBooks([]);
    }
  };

  const totalStudents = filteredBooks.reduce((sum, b) => sum + (Number(b.nextYearStudents) || 0), 0);
  const totalProjected = filteredBooks.reduce((sum, b) => sum + (Number(b.projectedRequired) || 0), 0);
  const totalStock = filteredBooks.reduce((sum, b) => sum + (Number(b.currentStock) || 0), 0);
  const totalOrder = filteredBooks.reduce((sum, b) => sum + (Number(b.orderQty) || 0), 0);

  const renderBookRow = (b: Book) => (
    <tr key={b.id} className={`hover:bg-blue-50/50 ${selectedBooks.includes(b.id) ? 'bg-blue-50/30' : ''}`}>
      {!isViewer && (
        <td className="px-3 py-3">
          <input 
            type="checkbox" 
            checked={selectedBooks.includes(b.id)}
            onChange={() => toggleSelection(b.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-3 py-3 text-xs">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          b.program === 'American' ? 'bg-red-50 text-red-700' : 
          b.program === 'British' ? 'bg-blue-50 text-blue-700' : 
          'bg-green-50 text-green-700'
        }`}>
          {b.program}
        </span>
      </td>
      <td className="px-3 py-3 text-xs font-medium text-gray-700">{b.grade}</td>
      <td className="px-3 py-3 text-xs text-gray-600">{b.subject}</td>
      <td className="px-3 py-3 text-xs font-medium text-gray-800 max-w-[200px] truncate" title={b.title}>{b.title}</td>
      <td className="px-3 py-3 text-center text-xs font-medium text-gray-700">
        {isViewer ? b.nextYearStudents : (
          <input 
            type="number" 
            value={b.nextYearStudents} 
            onChange={(e) => handleUpdateBook(b.id, 'nextYearStudents', parseInt(e.target.value) || 0)}
            className="w-16 px-1 py-0.5 text-center border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white transition-all"
          />
        )}
      </td>
      <td className="px-3 py-3 text-right text-xs font-medium text-blue-700">{b.projectedRequired}</td>
      <td className="px-3 py-3 text-right text-xs">
        {isViewer ? b.currentStock : (
          <input 
            type="number" 
            value={b.currentStock} 
            onChange={(e) => handleUpdateBook(b.id, 'currentStock', parseInt(e.target.value) || 0)}
            className="w-16 px-1 py-0.5 text-right border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white transition-all"
          />
        )}
      </td>
      <td className={`px-3 py-3 text-right text-sm font-bold ${b.orderQty > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
        {b.orderQty}
      </td>
      {!isViewer && (
        <td className="px-3 py-3 text-center whitespace-nowrap flex justify-center gap-2">
          <button onClick={() => setEditingBook(b)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-md" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDuplicate(b)} className="text-purple-600 hover:text-purple-800 bg-purple-50 p-1.5 rounded-md" title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded-md" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  );

  const renderGroupedBooks = () => {
    if (groupBy === 'none') return filteredBooks.map(renderBookRow);

    const groups: Record<string, Book[]> = {};
    filteredBooks.forEach(b => {
      const key = groupBy === 'grade' ? b.grade : b.subject;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    return Object.keys(groups).sort().map(key => (
      <React.Fragment key={key}>
        <tr className="bg-gray-100 border-y border-gray-200">
          <td colSpan={isViewer ? 8 : 10} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase">
            {groupBy === 'grade' ? 'Grade: ' : 'Subject: '} {key} ({groups[key].length} books)
          </td>
        </tr>
        {groups[key].map(renderBookRow)}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{filteredBooks.length}</div>
          <div className="text-xs text-gray-500 mt-1">Entries</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-green-600">{totalStudents}</div>
          <div className="text-xs text-gray-500 mt-1">Total Students</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{totalProjected}</div>
          <div className="text-xs text-gray-500 mt-1">Projected Need</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{totalStock}</div>
          <div className="text-xs text-gray-500 mt-1">Current Stock</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-600">{totalOrder}</div>
          <div className="text-xs text-gray-500 mt-1">Final Order Qty</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setGroupBy('none')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${groupBy === 'none' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}>List</button>
            <button onClick={() => setGroupBy('grade')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${groupBy === 'grade' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}>By Grade</button>
            <button onClick={() => setGroupBy('subject')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${groupBy === 'subject' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}>By Subject</button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <select 
              value={filterProgram} 
              onChange={e => { setFilterProgram(e.target.value); setFilterGrade(''); setFilterSubject(''); }} 
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
            >
              <option value="">All Programs</option>
              {allowedPrograms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select 
              value={filterGrade} 
              onChange={e => setFilterGrade(e.target.value)} 
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
            >
              <option value="">All Grades</option>
              {getFilterGrades().map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select 
              value={filterSubject} 
              onChange={e => setFilterSubject(e.target.value)} 
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
            >
              <option value="">All Subjects</option>
              {getFilterSubjects().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={filterStock} 
              onChange={e => setFilterStock(e.target.value)} 
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In Stock (&gt; 0)</option>
              <option value="out-of-stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>
        
        {!isViewer && selectedBooks.length > 0 && (
          <button 
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedBooks.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-max w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {!isViewer && (
                  <th className="px-3 py-3 text-left w-10">
                    <input 
                      type="checkbox" 
                      checked={filteredBooks.length > 0 && selectedBooks.length === filteredBooks.length}
                      onChange={toggleAllSelection}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Book Title</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Projected</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Order</th>
                {!isViewer && <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={isViewer ? 8 : 10} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No books found.
                  </td>
                </tr>
              ) : (
                renderGroupedBooks()
              )}
            </tbody>
            {filteredBooks.length > 0 && (
              <tfoot className="bg-green-50 border-t-2 border-green-500 font-bold">
                <tr>
                  {!isViewer && <td></td>}
                  <td colSpan={4} className="px-3 py-3 text-right text-sm text-gray-800">TOTAL</td>
                  <td className="px-3 py-3 text-center text-sm text-green-700">{totalStudents}</td>
                  <td className="px-3 py-3 text-right text-sm text-green-700">{totalProjected}</td>
                  <td className="px-3 py-3 text-right text-sm text-green-700">{totalStock}</td>
                  <td className="px-3 py-3 text-right text-sm text-green-700">{totalOrder}</td>
                  {!isViewer && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {editingBook && (
        <EditBookModal book={editingBook} onClose={() => setEditingBook(null)} />
      )}
    </div>
  );
}
