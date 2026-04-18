import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Book } from '../context/OrderContext';
import { Search, Loader2 } from 'lucide-react';

const CURRICULA: Record<string, { grades: string[], subjects: string[] }> = {
  American: { grades: ['KG1','KG2','G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Social Studies'] },
  British: { grades: ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','IG1','IG2','IG3'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Global Perspective'] },
  IB: { grades: ['PYP1','PYP2','PYP3','PYP4','PYP5','PYP6','PYP7','PYP8','MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','INS (Individuals & Societies)'] }
};

export default function LeftSidebar() {
  const { books, setBooks, customSubjects, setCustomSubjects, isLocked } = useOrder();
  const { userData, isViewer } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  
  const allowedPrograms = userData?.programs?.length ? userData.programs : Object.keys(CURRICULA);
  const allowedGrades = userData?.grades?.length ? userData.grades : null;
  const allowedSubjects = userData?.subjects?.length ? userData.subjects : null;

  const getGradesForProgram = (prog: string) => {
    const allGrades = CURRICULA[prog]?.grades || [];
    if (!allowedGrades) return allGrades;
    return allGrades.filter(g => allowedGrades.includes(g));
  };

  const getSubjectsForProgram = (prog: string) => {
    const allSubjects = [...(CURRICULA[prog]?.subjects || []), ...customSubjects];
    if (!allowedSubjects) return allSubjects;
    return allSubjects.filter(s => allowedSubjects.includes(s) || customSubjects.includes(s));
  };
  
  const [title, setTitle] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [subject, setSubject] = useState('General');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectValue, setCustomSubjectValue] = useState('');
  const [students, setStudents] = useState<number>(0);
  const [projectionPct, setProjectionPct] = useState<number>(20);
  const [stock, setStock] = useState<number>(0);
  const [format, setFormat] = useState('Hard Copy');
  const [type, setType] = useState('Student Copy');

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isbnStatus, setIsbnStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle');
  const [isbnMessage, setIsbnMessage] = useState('');

  const projected = Math.ceil(students + (students * projectionPct / 100));
  const orderQty = Math.max(0, projected - (format === 'Digital' ? 0 : stock));

  const validateISBN = (isbnStr: string) => {
    const clean = isbnStr.replace(/[-\s]/g, '');
    if (clean.length !== 10 && clean.length !== 13) return false;
    if (clean.length === 10) return /^\d{9}[\dX]$/i.test(clean);
    return /^\d{13}$/.test(clean);
  };

  const handleISBNLookup = async () => {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    if (!validateISBN(cleanIsbn)) {
      setIsbnStatus('invalid');
      setIsbnMessage('Invalid format');
      return;
    }

    setIsLookingUp(true);
    setIsbnStatus('idle');
    setIsbnMessage('Looking up...');

    try {
      let foundTitle = '';
      let foundPublisher = '';
      let foundEdition = '';

      // 1. Try Google Books API
      const res1 = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
      const data1 = await res1.json();

      if (data1.items && data1.items.length > 0) {
        const info = data1.items[0].volumeInfo;
        foundTitle = info.title || '';
        if (info.subtitle) foundTitle += `: ${info.subtitle}`;
        foundPublisher = info.publisher || '';
        // Google Books sometimes puts edition in the title or description, but no explicit field usually.
      }

      // 2. Try OpenLibrary API (details) if Google Books didn't find everything
      if (!foundTitle || !foundPublisher) {
        const res2 = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=details`);
        const data2 = await res2.json();
        const key = `ISBN:${cleanIsbn}`;

        if (data2[key] && data2[key].details) {
          const details = data2[key].details;
          if (!foundTitle && details.title) foundTitle = details.title;
          if (!foundPublisher && details.publishers && details.publishers.length > 0) {
            foundPublisher = details.publishers.join(', ');
          }
          if (details.edition_name) {
            foundEdition = details.edition_name;
          } else if (details.revision) {
            foundEdition = `Rev ${details.revision}`;
          }
        }
      }

      if (foundTitle) {
        let finalTitle = foundTitle;
        if (foundEdition && !finalTitle.toLowerCase().includes('edition')) {
          finalTitle += ` (${foundEdition})`;
        }
        setTitle(finalTitle);
        if (foundPublisher) setPublisher(foundPublisher);
        
        setIsbnStatus('valid');
        setIsbnMessage(`Found: ${finalTitle.substring(0, 25)}${finalTitle.length > 25 ? '...' : ''}`);
      } else {
        setIsbnStatus('invalid');
        setIsbnMessage('ISBN not found in databases');
      }
    } catch (err) {
      console.error("ISBN Lookup Error:", err);
      setIsbnStatus('error');
      setIsbnMessage('Lookup failed. Please check connection.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddBook = () => {
    if (!selectedProgram || !selectedGrade || !title) return;
    
    const finalSubject = isCustomSubject && customSubjectValue.trim() ? customSubjectValue.trim() : subject;

    if (isCustomSubject && finalSubject && !customSubjects.includes(finalSubject)) {
      setCustomSubjects([...customSubjects, finalSubject]);
    }

    const newBook: Book = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      program: selectedProgram,
      grade: selectedGrade,
      subject: finalSubject,
      title,
      isbn,
      publisher,
      nextYearStudents: students,
      projectionPct,
      projectedRequired: projected,
      currentStock: stock,
      orderQty,
      format,
      type,
      addedAt: new Date().toISOString()
    };

    setBooks([...books, newBook]);
    
    // Reset form
    setTitle('');
    setIsbn('');
    setPublisher('');
    setStudents(0);
    setStock(0);
    setIsbnStatus('idle');
    setIsbnMessage('');
    setIsCustomSubject(false);
    setCustomSubjectValue('');
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="font-bold text-blue-900 text-sm">
          {selectedProgram && selectedGrade ? `${selectedProgram} Curriculum — ${selectedGrade}` : 'Select a Program & Grade'}
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Curriculum Program</label>
          <div className="grid grid-cols-3 gap-2">
            {allowedPrograms.map(prog => (
              <button 
                key={prog}
                onClick={() => { setSelectedProgram(prog); setSelectedGrade(null); }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${selectedProgram === prog ? 'border-blue-800 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <span className="text-sm font-bold text-gray-800 block">{prog}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedProgram && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Grade Level</label>
            <div className="grid grid-cols-4 gap-2">
              {getGradesForProgram(selectedProgram).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${selectedGrade === g ? 'bg-blue-800 text-white border-blue-800' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-green-50 flex-1">
        <div className="font-bold text-green-800 text-sm mb-4">Enter Book Order Details</div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Book Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" placeholder="Enter book title" />
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                ISBN <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">Lookup</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={isbn} 
                    onChange={e => {
                      setIsbn(e.target.value);
                      setIsbnStatus('idle');
                      setIsbnMessage('');
                    }} 
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono ${
                      isbnStatus === 'valid' ? 'border-green-500 ring-1 ring-green-500' : 
                      isbnStatus === 'invalid' ? 'border-red-500 ring-1 ring-red-500' : 
                      'border-gray-300'
                    }`} 
                    placeholder="978-0-13-..." 
                  />
                  {isbnMessage && (
                    <div className={`text-[10px] mt-1 absolute ${isbnStatus === 'valid' ? 'text-green-600' : isbnStatus === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
                      {isbnMessage}
                    </div>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={handleISBNLookup}
                  disabled={isLookingUp || !isbn.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap h-[38px]"
                >
                  {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Lookup
                </button>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Publisher</label>
              <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" placeholder="Publisher" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
            {!isCustomSubject ? (
              <select 
                value={subject} 
                onChange={e => {
                  if (e.target.value === 'custom') {
                    setIsCustomSubject(true);
                  } else {
                    setSubject(e.target.value);
                  }
                }} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="General">General</option>
                {selectedProgram && getSubjectsForProgram(selectedProgram).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="custom" className="font-bold text-blue-600">+ Add Custom Subject...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={customSubjectValue} 
                  onChange={e => setCustomSubjectValue(e.target.value)} 
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" 
                  placeholder="Enter custom subject" 
                  autoFocus
                />
                <button 
                  onClick={() => { setIsCustomSubject(false); setCustomSubjectValue(''); }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Format</label>
              <select value={format} onChange={e => {
                setFormat(e.target.value);
                if (e.target.value === 'Digital') setStock(0);
              }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                <option value="Hard Copy">Hard Copy</option>
                <option value="Digital">Digital</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                <option value="Student Copy">Student Copy</option>
                <option value="Teacher Edition">Teacher Edition</option>
                <option value="Resource Material">Resource Material</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-3">
            <div className="text-xs font-bold text-blue-900">Enrollment & Projection</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Students</label>
                <input type="number" value={students || ''} onChange={e => setStudents(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Projection %</label>
                <select value={projectionPct} onChange={e => setProjectionPct(parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                  <option value={25}>25%</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Stock</label>
                <input 
                  type="number" 
                  value={format === 'Digital' ? 0 : (stock || '')} 
                  onChange={e => setStock(parseInt(e.target.value) || 0)} 
                  disabled={format === 'Digital'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Final Order Qty</label>
                <div className="w-full px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-lg font-bold text-green-800 text-center">{orderQty}</div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleAddBook}
            disabled={!selectedProgram || !selectedGrade || !title || isViewer || isLocked}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-xl font-semibold text-sm transition shadow-sm mt-4"
          >
            {isViewer ? 'View Only Mode' : isLocked ? 'Locked (Final Version)' : 'Add Book to Order'}
          </button>
        </div>
      </div>
    </aside>
  );
}
