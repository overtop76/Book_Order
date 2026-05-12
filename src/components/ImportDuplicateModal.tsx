import React, { useState } from 'react';
import { Book } from '../context/OrderContext';

interface DuplicateMatch {
  importedBook: Book;
  existingBook: Book;
  matchReason: string;
}

interface ImportDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: DuplicateMatch[];
  nonDuplicates: Book[];
  onConfirm: (booksToAdd: Book[], existingBooksToReplace: string[]) => void;
}

export default function ImportDuplicateModal({ isOpen, onClose, matches, nonDuplicates, onConfirm }: ImportDuplicateModalProps) {
  // state to track which imported books we want to add, and which existing we want to replace
  // options per duplicate match: 'skip', 'add_new' (keep both), 'replace' (replace existing with imported)
  const [decisions, setDecisions] = useState<Record<string, 'skip' | 'add_new' | 'replace'>>({});

  if (!isOpen) return null;

  const handleDecision = (importedId: string, decision: 'skip' | 'add_new' | 'replace') => {
    setDecisions(prev => ({ ...prev, [importedId]: decision }));
  };

  const setAll = (decision: 'skip' | 'add_new' | 'replace') => {
    const newDecisions: Record<string, 'skip' | 'add_new' | 'replace'> = {};
    matches.forEach(m => {
      newDecisions[m.importedBook.id] = decision;
    });
    setDecisions(newDecisions);
  };

  const handleConfirm = () => {
    let booksToAdd = [...nonDuplicates];
    let existingBooksToReplace: string[] = [];

    matches.forEach(m => {
      const decision = decisions[m.importedBook.id] || 'skip';
      if (decision === 'add_new') {
        // Change ID to avoid real react key clash if needed
        booksToAdd.push({ ...m.importedBook, id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` });
      } else if (decision === 'replace') {
        booksToAdd.push({ ...m.importedBook, id: m.existingBook.id }); // Use existing ID so it gets overwritten in state instead of add
        existingBooksToReplace.push(m.existingBook.id);
      }
    });

    onConfirm(booksToAdd, existingBooksToReplace);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Resolve Import Duplicates</h2>
          <p className="text-sm text-gray-500 mt-1">
            We found {matches.length} books in your import that closely match existing books in this order.
            Please decide what to do with them. We also found {nonDuplicates.length} new books.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex gap-2">
            <button onClick={() => setAll('skip')} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Skip All</button>
            <button onClick={() => setAll('replace')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg">Replace All Existing</button>
            <button onClick={() => setAll('add_new')} className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg">Add All as New (Duplicate)</button>
          </div>

          <div className="space-y-4">
            {matches.map(({ importedBook, existingBook, matchReason }) => {
               const decision = decisions[importedBook.id] || 'skip';
               return (
                 <div key={importedBook.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4">
                   <div className="flex-1">
                     <p className="text-xs font-semibold text-red-500 uppercase mb-1">Matched on: {matchReason}</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Existing Book</p>
                          <p className="text-sm font-medium">{existingBook.title}</p>
                          <p className="text-xs text-gray-500">ISBN: {existingBook.isbn || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Subject: {existingBook.subject} ({existingBook.program} - {existingBook.grade})</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">Imported Book</p>
                          <p className="text-sm font-medium">{importedBook.title}</p>
                          <p className="text-xs text-gray-500">ISBN: {importedBook.isbn || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Subject: {importedBook.subject} ({importedBook.program} - {importedBook.grade})</p>
                        </div>
                     </div>
                   </div>
                   <div className="flex flex-col gap-2 w-full sm:w-48 justify-center">
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'skip'} onChange={() => handleDecision(importedBook.id, 'skip')} />
                       Skip (Keep Existing)
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'replace'} onChange={() => handleDecision(importedBook.id, 'replace')} />
                       Replace Existing
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input type="radio" name={`action_${importedBook.id}`} checked={decision === 'add_new'} onChange={() => handleDecision(importedBook.id, 'add_new')} />
                       Add Both
                     </label>
                   </div>
                 </div>
               );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Cancel Import
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition shadow-sm"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
