import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X } from 'lucide-react';

interface User {
  uid: string;
  name: string;
  email: string;
  programs?: string[];
  grades?: string[];
  subjects?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: () => void;
}

const ALL_PROGRAMS = ['American', 'British', 'IB'];
const ALL_GRADES = [
  'KG1','KG2','G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12', // American
  'FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','IG1','IG2','IG3', // British
  'PYP1','PYP2','PYP3','PYP4','PYP5','PYP6','PYP7','PYP8','MYP1','MYP2','MYP3','MYP4','MYP5','DP1','DP2' // IB
];
const ALL_SUBJECTS = [
  'English','Math','Science','French','German','Spanish','Humanities','Social Studies','Global Perspective','INS (Individuals & Societies)','General'
];

export default function UserPermissionsModal({ isOpen, onClose, user, onUpdate }: Props) {
  const [programs, setPrograms] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setPrograms(user.programs || []);
      setGrades(user.grades || []);
      setSubjects(user.subjects || []);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        programs,
        grades,
        subjects
      });

      const { logAction } = await import('../utils/auditLogger');
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (currentUser) {
        await logAction({ uid: currentUser.uid, email: currentUser.email || '', name: currentUser.displayName || '' }, 'UPDATE_PERMISSIONS', `Updated permissions for ${user.email}`);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating permissions:", error);
      alert("Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-gray-900">Edit Permissions: {user.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <p className="text-sm text-gray-500 mb-4">
            Select the specific programs, grades, and subjects this user is allowed to access. 
            Leave all unchecked to grant access to EVERYTHING.
          </p>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Programs</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_PROGRAMS.map(p => (
                <button
                  key={p}
                  onClick={() => toggleSelection(p, programs, setPrograms)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    programs.includes(p) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSelection(s, subjects, setSubjects)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    subjects.includes(s) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Grades</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_GRADES.map(g => (
                <button
                  key={g}
                  onClick={() => toggleSelection(g, grades, setGrades)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    grades.includes(g) ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
