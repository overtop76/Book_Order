import React, { useState } from 'react';
import { Book, useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { X, Save, Edit } from 'lucide-react';

interface BulkEditModalProps {
  selectedBookIds: string[];
  onClose: () => void;
  clearSelection: () => void;
}

export default function BulkEditModal({ selectedBookIds, onClose, clearSelection }: BulkEditModalProps) {
  const { books, setBooks, customSubjects, setCustomSubjects } = useOrder();
  const { userData } = useAuth();
  
  const [updateFields, setUpdateFields] = useState({
    program: false,
    grade: false,
    subject: false,
    nextYearStudents: false,
    projectionPct: false,
    format: false,
    type: false,
  });

  const [formData, setFormData] = useState({
    program: '',
    grade: '',
    subject: '',
    nextYearStudents: 0,
    projectionPct: 0,
    format: 'Hard Copy',
    type: 'Student Copy'
  });

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

  const handleFieldToggle = (field: keyof typeof updateFields) => {
    setUpdateFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

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

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    let finalSubject = formData.subject;
    if (updateFields.subject && isCustomSubject && customSubjectValue.trim()) {
      finalSubject = customSubjectValue.trim();
      if (!customSubjects.includes(finalSubject)) {
        setCustomSubjects([...customSubjects, finalSubject]);
      }
    }

    const updatedBooks = books.map(b => {
      if (!selectedBookIds.includes(b.id)) return b;

      const newBook = { ...b };
      
      if (updateFields.program) newBook.program = formData.program;
      if (updateFields.grade) newBook.grade = formData.grade;
      if (updateFields.subject) newBook.subject = finalSubject;
      if (updateFields.format) newBook.format = formData.format;
      if (updateFields.type) newBook.type = formData.type;
      
      if (updateFields.nextYearStudents) newBook.nextYearStudents = Number(formData.nextYearStudents) || 0;
      if (updateFields.projectionPct) newBook.projectionPct = Number(formData.projectionPct) || 0;

      if (updateFields.nextYearStudents || updateFields.projectionPct || updateFields.format) {
        const format = updateFields.format ? formData.format : b.format;
        const students = updateFields.nextYearStudents ? (Number(formData.nextYearStudents) || 0) : (Number(b.nextYearStudents) || 0);
        const pct = updateFields.projectionPct ? (Number(formData.projectionPct) || 0) : (Number(b.projectionPct) || 0);

        const stock = format === 'Digital' ? 0 : (Number(b.currentStock) || 0);
        
        newBook.currentStock = stock;
        newBook.projectedRequired = Math.ceil(students + (students * pct / 100));
        newBook.orderQty = Math.max(0, newBook.projectedRequired - stock);
      }

      return newBook;
    });
    
    setBooks(updatedBooks);
    clearSelection();
    onClose();
  };

  const hasAnyUpdate = Object.values(updateFields).some(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            Bulk Edit ({selectedBookIds.length} items)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 text-sm text-gray-600">
            Select the fields you want to update for all selected items. Fields left unchecked will remain unchanged.
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Program */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.program} onChange={() => handleFieldToggle('program')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Program
              </label>
              <select name="program" value={formData.program} onChange={handleChange} disabled={!updateFields.program} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                <option value="">Select Program</option>
                {allowedPrograms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Grade */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.grade} onChange={() => handleFieldToggle('grade')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Grade
              </label>
              {updateFields.program ? (
                <select name="grade" value={formData.grade} onChange={handleChange} disabled={!updateFields.grade || !formData.program} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                  <option value="">Select Grade</option>
                  {formData.program && getGradesForProgram(formData.program).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : (
                <div className="text-xs text-gray-500 py-2 border border-transparent">
                  Update Program must be enabled to change Grade.
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="col-span-2 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.subject} onChange={() => handleFieldToggle('subject')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Subject
              </label>
              {updateFields.program ? (
                 <>
                  <select name="subject" value={formData.subject} onChange={handleChange} disabled={!updateFields.subject || !formData.program} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                    <option value="">Select Subject</option>
                    {formData.program && getSubjectsForProgram(formData.program).map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom" className="font-bold text-blue-600">+ Add Custom Subject...</option>
                  </select>
                  {isCustomSubject && updateFields.subject && (
                    <input 
                      type="text" 
                      value={customSubjectValue} 
                      onChange={e => setCustomSubjectValue(e.target.value)} 
                      placeholder="Enter custom subject name"
                      className="mt-2 w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                 </>
              ) : (
                <div className="text-xs text-gray-500 py-2 border border-transparent">
                  Update Program must be enabled to change Subject.
                </div>
              )}
            </div>

            {/* Next Year Students */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.nextYearStudents} onChange={() => handleFieldToggle('nextYearStudents')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Next Year Students
              </label>
              <input type="number" name="nextYearStudents" value={formData.nextYearStudents} onChange={handleChange} disabled={!updateFields.nextYearStudents} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60" />
            </div>

            {/* Projection % */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.projectionPct} onChange={() => handleFieldToggle('projectionPct')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Projection %
              </label>
              <select name="projectionPct" value={formData.projectionPct} onChange={handleChange} disabled={!updateFields.projectionPct} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
                <option value={25}>25%</option>
              </select>
            </div>

            {/* Format */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.format} onChange={() => handleFieldToggle('format')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Format
              </label>
              <select name="format" value={formData.format} onChange={handleChange} disabled={!updateFields.format} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                <option value="Hard Copy">Hard Copy</option>
                <option value="Digital">Digital</option>
                <option value="Both">Both</option>
                <option value="Booklet">Booklet</option>
              </select>
            </div>

            {/* Type */}
            <div className="col-span-2 sm:col-span-1 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
              <label className="flex items-center gap-2 mb-2 font-semibold text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={updateFields.type} onChange={() => handleFieldToggle('type')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Update Type
              </label>
              <select name="type" value={formData.type} onChange={handleChange} disabled={!updateFields.type} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60">
                <option value="Student Copy">Student Copy</option>
                <option value="Teacher Edition">Teacher Edition</option>
                <option value="Resource Material">Resource Material</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!hasAnyUpdate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
