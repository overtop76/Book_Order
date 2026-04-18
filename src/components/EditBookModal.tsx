import React, { useState, useEffect } from 'react';
import { Book, useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { X, Save } from 'lucide-react';

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
}

export default function EditBookModal({ book, onClose }: EditBookModalProps) {
  const { books, setBooks, customSubjects, setCustomSubjects } = useOrder();
  const { userData } = useAuth();
  
  const [formData, setFormData] = useState<Book>({ ...book });
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectValue, setCustomSubjectValue] = useState('');

  const CURRICULA: Record<string, { grades: string[], subjects: string[] }> = {
    American: { grades: ['KG1','KG2','G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Social Studies'] },
    British: { grades: ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','IG1','IG2','IG3'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','Global Perspective'] },
    IB: { grades: ['PYP1','PYP2','PYP3','PYP4','PYP5','PYP6','PYP7','PYP8','MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2'], subjects: ['English','Math','Science','French','German','Spanish','Humanities','INS (Individuals & Societies)'] }
  };

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

  useEffect(() => {
    if (formData.program) {
      const subjects = getSubjectsForProgram(formData.program);
      if (formData.subject && !subjects.includes(formData.subject)) {
        setIsCustomSubject(true);
        setCustomSubjectValue(formData.subject);
        setFormData(prev => ({ ...prev, subject: 'custom' }));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'subject') {
      if (value === 'custom') {
        setIsCustomSubject(true);
        setFormData(prev => ({ ...prev, subject: 'custom' }));
      } else {
        setIsCustomSubject(false);
        setFormData(prev => ({ ...prev, subject: value }));
      }
      return;
    }

    if (name === 'program') {
      setFormData(prev => ({ ...prev, program: value, grade: '', subject: '' }));
      return;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (['nextYearStudents', 'projectionPct', 'currentStock', 'format'].includes(name)) {
        const students = name === 'nextYearStudents' ? parseInt(value) || 0 : prev.nextYearStudents;
        const pct = name === 'projectionPct' ? parseInt(value) || 0 : prev.projectionPct;
        const format = name === 'format' ? value : prev.format;
        const stock = format === 'Digital' ? 0 : (name === 'currentStock' ? parseInt(value) || 0 : prev.currentStock);
        
        updated.currentStock = stock;
        updated.projectedRequired = Math.ceil(students + (students * pct / 100));
        updated.orderQty = Math.max(0, updated.projectedRequired - stock);
      }
      
      return updated;
    });
  };

  const handleSave = () => {
    let finalSubject = formData.subject;
    if (isCustomSubject && customSubjectValue.trim()) {
      finalSubject = customSubjectValue.trim();
      if (!customSubjects.includes(finalSubject)) {
        setCustomSubjects([...customSubjects, finalSubject]);
      }
    }

    const updatedBook = { ...formData, subject: finalSubject };
    
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Edit Book</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
              <select name="program" value={formData.program} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select Program</option>
                {allowedPrograms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Grade</label>
              <select name="grade" value={formData.grade} onChange={handleChange} disabled={!formData.program} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100">
                <option value="">Select Grade</option>
                {formData.program && getGradesForProgram(formData.program).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <select name="subject" value={formData.subject} onChange={handleChange} disabled={!formData.program} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100">
                <option value="">Select Subject</option>
                {formData.program && getSubjectsForProgram(formData.program).map(s => <option key={s} value={s}>{s}</option>)}
                <option value="custom" className="font-bold text-blue-600">+ Add Custom Subject...</option>
              </select>
              {isCustomSubject && (
                <input 
                  type="text" 
                  value={customSubjectValue} 
                  onChange={e => setCustomSubjectValue(e.target.value)} 
                  placeholder="Enter custom subject name"
                  className="mt-2 w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Book Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ISBN</label>
              <input type="text" name="isbn" value={formData.isbn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Publisher</label>
              <input type="text" name="publisher" value={formData.publisher} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Next Year Students</label>
              <input type="number" name="nextYearStudents" value={formData.nextYearStudents} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Projection %</label>
              <select name="projectionPct" value={formData.projectionPct} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={25}>25%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Current Stock</label>
              <input type="number" name="currentStock" value={formData.format === 'Digital' ? 0 : formData.currentStock} onChange={handleChange} disabled={formData.format === 'Digital'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Format</label>
              <select name="format" value={formData.format} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="Hard Copy">Hard Copy</option>
                <option value="Digital">Digital</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="Student Copy">Student Copy</option>
                <option value="Teacher Edition">Teacher Edition</option>
                <option value="Resource Material">Resource Material</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
