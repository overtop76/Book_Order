import React, { useState, useEffect } from 'react';
import { Book } from '../context/OrderContext';
import { Check, X, Trash2, AlertTriangle } from 'lucide-react';

interface DuplicateMatch {
  importedBook: Book;
  existingBook: Book;
  matchReason: string;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: DuplicateMatch[];
  nonDuplicates: Book[];
  onConfirm: (booksToAdd: Book[], existingBooksToReplace: string[]) => void;
}

export default function ImportPreviewModal({ isOpen, onClose, matches, nonDuplicates, onConfirm }: ImportPreviewModalProps) {
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<string, 'skip' | 'add_new' | 'replace'>>({});
  const [newDecisions, setNewDecisions] = useState<Record<string, 'add' | 'skip'>>({});

  useEffect(() => {
    if (isOpen) {
      const initialDup: Record<string, 'skip' | 'add_new' | 'replace'> = {};
      matches.forEach(m => initialDup[m.importedBook.id] = 'skip');
      setDuplicateDecisions(initialDup);

      const initialNew: Record<string, 'add' | 'skip'> = {};
      nonDuplicates.forEach(b => initialNew[b.id] = 'add');
      setNewDecisions(initialNew);
    }
  }, [isOpen, matches, nonDuplicates]);

  if (!isOpen) return null;

  const handleDupDecision = (importedId: string, decision: 'skip' | 'add_new' | 'replace') => {
    setDuplicateDecisions(prev => ({ ...prev, [importedId]: decision }));
  };

  const handleNewDecision = (importedId: string, decision: 'add' | 'skip') => {
    setNewDecisions(prev => ({ ...prev, [importedId]: decision }));
  };

  const setAllDup = (decision: 'skip' | 'add_new' | 'replace') => {
    setDuplicateDecisions(prev => {
      const result: Record<string, 'skip' | 'add_new' | 'replace'> = {};
      matches.forEach(m => result[m.importedBook.id] = decision);
      return result;
    });
  };

  const setAllNew = (decision: 'add' | 'skip') => {
    setNewDecisions(prev => {
      const result: Record<string, 'add' | 'skip'> = {};
      nonDuplicates.forEach(b => result[b.id] = decision);
      return result;
    });
  };

  const handleConfirm = () => {
    let booksToAdd: Book[] = [];
    let existingBooksToReplace: string[] = [];

    nonDuplicates.forEach(b => {
      if (newDecisions[b.id] === 'add') {
        booksToAdd.push(b);
      }
    });

    matches.forEach(m => {
      const decision = duplicateDecisions[m.importedBook.id] || 'skip';
      if (decision === 'add_new') {
        booksToAdd.push({ ...m.importedBook, id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` });
      } else if (decision === 'replace') {
        booksToAdd.push({ ...m.importedBook, id: m.existingBook.id });
        existingBooksToReplace.push(m.existingBook.id);
      }
    });

    onConfirm(booksToAdd, existingBooksToReplace);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Import</h2>
            <p className="text-sm text-gray-500 mt-1">
              Review the imported data before saving. We found {matches.length} duplicates and {nonDuplicates.length} new entries.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {matches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Potential Duplicates ({matches.length})
                </h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setDuplicateDecisions(prev => { const res = {...prev}; matches.forEach(m => res[m.importedBook.id] = 'skip'); return res; })} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Skip All</button>
                  <button onClick={() => setDuplicateDecisions(prev => { const res = {...prev}; matches.forEach(m => res[m.importedBook.id] = 'replace'); return res; })} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg">Replace All Existing</button>
                  <button onClick={() => setDuplicateDecisions(prev => { const res = {...prev}; matches.forEach(m => res[m.importedBook.id] = 'add_new'); return res; })} className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">Add All as Duplicate</button>
                </div>
              </div>

              <div className="space-y-4">
                {matches.map(({ importedBook, existingBook, matchReason }) => {
                  const decision = duplicateDecisions[importedBook.id] || 'skip';
                  return (
                    <div key={importedBook.id} className={`border rounded-lg p-4 flex flex-col sm:flex-row gap-4 ${decision === 'skip' ? 'bg-red-50 border-red-200' : decision === 'replace' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-red-500 uppercase mb-2">Matched on: {matchReason}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Current / Existing</p>
                            <p className="text-sm font-medium">{existingBook.title}</p>
                            <p className="text-xs text-gray-500 mt-1">ISBN: {existingBook.isbn || 'N/A'}</p>
                            <p className="text-xs text-gray-500">Subject: {existingBook.subject} ({existingBook.program} - {existingBook.grade})</p>
                          </div>
                          <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Imported</p>
                            <p className="text-sm font-medium">{importedBook.title}</p>
                            <p className="text-xs text-gray-500 mt-1">ISBN: {importedBook.isbn || 'N/A'}</p>
                            <p className="text-xs text-gray-500">Subject: {importedBook.subject} ({importedBook.program} - {importedBook.grade})</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-56 justify-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Resolution Action:</p>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'skip'} onChange={() => handleDupDecision(importedBook.id, 'skip')} className="text-red-600 focus:ring-red-500" />
                          <span className="text-gray-700">Skip (Delete Imported)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'replace'} onChange={() => handleDupDecision(importedBook.id, 'replace')} className="text-blue-600 focus:ring-blue-500" />
                          <span className="text-gray-700">Replace (Delete Current)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'add_new'} onChange={() => handleDupDecision(importedBook.id, 'add_new')} className="text-green-600 focus:ring-green-500" />
                          <span className="text-gray-700">Add Both (Duplicate)</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nonDuplicates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  New Entries ({nonDuplicates.length})
                </h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setAllNew('add')} className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg">Add All</button>
                  <button onClick={() => setAllNew('skip')} className="px-3 py-1.5 bg-red-100 text-red-800 hover:bg-red-200 rounded-lg">Skip All</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {nonDuplicates.map(b => {
                  const decision = newDecisions[b.id] || 'add';
                  return (
                    <div key={b.id} className={`border rounded-lg p-3 flex justify-between items-start transition ${decision === 'add' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200 opacity-50' }`}>
                      <div className="pr-2 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate" title={b.title}>{b.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">ISBN: {b.isbn || 'N/A'}</p>
                        <p className="text-xs text-gray-500 truncate">{b.program} • {b.grade} • {b.subject}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-1">
                         <button onClick={() => handleNewDecision(b.id, 'add')} className={`p-1.5 rounded-md ${decision === 'add' ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} title="Add Entry">
                           <Check className="w-3.5 h-3.5" />
                         </button>
                         <button onClick={() => handleNewDecision(b.id, 'skip')} className={`p-1.5 rounded-md ${decision === 'skip' ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`} title="Skip Entry">
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel Import
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}

