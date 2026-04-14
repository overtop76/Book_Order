import React from 'react';
import { useOrder, Book } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Copy, Edit2 } from 'lucide-react';

export default function DataTable() {
  const { books, setBooks } = useOrder();
  const { isViewer } = useAuth();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      setBooks(books.filter(b => b.id !== id));
    }
  };

  const handleDuplicate = (book: Book) => {
    const newBook = { ...book, id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: `${book.title} (Copy)` };
    setBooks([...books, newBook]);
  };

  const totalStudents = books.reduce((sum, b) => sum + b.nextYearStudents, 0);
  const totalProjected = books.reduce((sum, b) => sum + b.projectedRequired, 0);
  const totalStock = books.reduce((sum, b) => sum + b.currentStock, 0);
  const totalOrder = books.reduce((sum, b) => sum + b.orderQty, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{books.length}</div>
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

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
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
              {books.length === 0 ? (
                <tr>
                  <td colSpan={isViewer ? 8 : 9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No books added yet. Select a program and grade, then enter book details.
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/50">
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
                    <td className="px-3 py-3 text-center text-xs font-medium text-gray-700">{b.nextYearStudents}</td>
                    <td className="px-3 py-3 text-right text-xs font-medium text-blue-700">{b.projectedRequired}</td>
                    <td className="px-3 py-3 text-right text-xs">{b.currentStock}</td>
                    <td className={`px-3 py-3 text-right text-sm font-bold ${b.orderQty > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {b.orderQty}
                    </td>
                    {!isViewer && (
                      <td className="px-3 py-3 text-center whitespace-nowrap flex justify-center gap-2">
                        <button onClick={() => handleDuplicate(b)} className="text-purple-600 hover:text-purple-800 bg-purple-50 p-1.5 rounded-md" title="Duplicate">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded-md" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {books.length > 0 && (
              <tfoot className="bg-green-50 border-t-2 border-green-500 font-bold">
                <tr>
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
    </div>
  );
}
