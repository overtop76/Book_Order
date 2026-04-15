import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export interface Book {
  id: string;
  program: string;
  grade: string;
  subject: string;
  title: string;
  isbn: string;
  publisher: string;
  nextYearStudents: number;
  projectionPct: number;
  projectedRequired: number;
  currentStock: number;
  orderQty: number;
  format: string;
  type: string;
  addedAt: string;
}

export interface Order {
  id: string;
  name: string;
  program?: string;
  grade?: string;
  academicYear?: string;
  schoolName?: string;
  books: string; // JSON stringified Book[]
  customSubjects: string; // JSON stringified string[]
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creatorPrograms?: string[];
  creatorGrades?: string[];
  creatorSubjects?: string[];
}

interface OrderContextType {
  currentOrder: Order | null;
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  customSubjects: string[];
  setCustomSubjects: React.Dispatch<React.SetStateAction<string[]>>;
  saveOrder: (name: string, academicYear: string, schoolName: string) => Promise<void>;
  loadOrder: (orderId: string) => void;
  orders: Order[];
  filterProgram: string;
  setFilterProgram: React.Dispatch<React.SetStateAction<string>>;
  filterGrade: string;
  setFilterGrade: React.Dispatch<React.SetStateAction<string>>;
  filterSubject: string;
  setFilterSubject: React.Dispatch<React.SetStateAction<string>>;
  groupBy: 'none' | 'grade' | 'subject';
  setGroupBy: React.Dispatch<React.SetStateAction<'none' | 'grade' | 'subject'>>;
  viewMode: 'order' | 'stock';
  setViewMode: React.Dispatch<React.SetStateAction<'order' | 'stock'>>;
  isAutoSaving: boolean;
  orderName: string;
  setOrderName: React.Dispatch<React.SetStateAction<string>>;
  academicYear: string;
  setAcademicYear: React.Dispatch<React.SetStateAction<string>>;
  schoolName: string;
  setSchoolName: React.Dispatch<React.SetStateAction<string>>;
  lastSavedAt: Date | null;
}

const OrderContext = createContext<OrderContextType | null>(null);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [filterProgram, setFilterProgram] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'grade' | 'subject'>('none');
  const [viewMode, setViewMode] = useState<'order' | 'stock'>('order');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [schoolName, setSchoolName] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveOrderRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    // Listen to orders
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => doc.data() as Order);
      
      let filteredOrders = ordersList;
      
      if (userData) {
        const userPrograms = userData.programs || [];
        const userGrades = userData.grades || [];
        const userSubjects = userData.subjects || [];
        
        const hasSpecificPermissions = userPrograms.length > 0 || userGrades.length > 0 || userSubjects.length > 0;
        
        if (hasSpecificPermissions) {
          filteredOrders = ordersList.filter(order => {
            // Always see own orders
            if (order.createdBy === user.uid) return true;
            
            const orderPrograms = order.creatorPrograms || [];
            const orderGrades = order.creatorGrades || [];
            const orderSubjects = order.creatorSubjects || [];
            
            // If the order creator has NO specific permissions, they are a super admin, so everyone can see their orders?
            // Or maybe only if they share a permission. Let's check if they share ANY permission.
            const sharesProgram = userPrograms.some(p => orderPrograms.includes(p));
            const sharesGrade = userGrades.some(g => orderGrades.includes(g));
            const sharesSubject = userSubjects.some(s => orderSubjects.includes(s));
            
            // If the order creator is a super admin (no permissions set), let's allow everyone to see it, 
            // OR we can restrict it. The prompt says "view all entered orders by other Admins having the same permission".
            // So if they share a permission, they can see it.
            const creatorIsSuperAdmin = orderPrograms.length === 0 && orderGrades.length === 0 && orderSubjects.length === 0;
            
            return sharesProgram || sharesGrade || sharesSubject || creatorIsSuperAdmin;
          });
        }
      }
      
      setOrders(filteredOrders);
    });

    return () => unsubscribe();
  }, [user, userData]);

  const saveOrder = async (name: string, academicYear: string, schoolName: string) => {
    if (!user) return;
    
    setIsAutoSaving(true);
    try {
      const orderId = currentOrder?.id || `order_${Date.now()}`;
      const newOrder: Order = {
        id: orderId,
        name,
        academicYear,
        schoolName,
        books: JSON.stringify(books),
        customSubjects: JSON.stringify(customSubjects),
        createdBy: user.uid,
        createdAt: currentOrder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorPrograms: userData?.programs || [],
        creatorGrades: userData?.grades || [],
        creatorSubjects: userData?.subjects || [],
      };

      await setDoc(doc(db, 'orders', orderId), newOrder);
      setCurrentOrder(newOrder);
      setLastSavedAt(new Date());
    } finally {
      setIsAutoSaving(false);
    }
  };

  useEffect(() => {
    saveOrderRef.current = saveOrder;
  });

  // Auto-save effect
  useEffect(() => {
    if (books.length === 0 && !orderName) return;
    
    const timer = setTimeout(() => {
      // Auto-save as 'Draft Order' if no name provided yet
      if (saveOrderRef.current) saveOrderRef.current(orderName || 'Draft Order', academicYear, schoolName);
    }, 2000); // Debounce for 2 seconds

    // Also set up a 2-minute regular interval save
    const intervalTimer = setInterval(() => {
      if (saveOrderRef.current) saveOrderRef.current(orderName || 'Draft Order', academicYear, schoolName);
    }, 120000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalTimer);
    };
  }, [books, customSubjects, orderName, academicYear, schoolName]);

  const loadOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setCurrentOrder(order);
      setBooks(JSON.parse(order.books));
      setCustomSubjects(order.customSubjects ? JSON.parse(order.customSubjects) : []);
      setOrderName(order.name || '');
      setAcademicYear(order.academicYear || '2026-2027');
      setSchoolName(order.schoolName || '');
      if (order.updatedAt) setLastSavedAt(new Date(order.updatedAt));
    }
  };

  return (
    <OrderContext.Provider value={{ 
      currentOrder, books, setBooks, customSubjects, setCustomSubjects, saveOrder, loadOrder, orders,
      filterProgram, setFilterProgram, filterGrade, setFilterGrade, filterSubject, setFilterSubject,
      groupBy, setGroupBy, viewMode, setViewMode, isAutoSaving,
      orderName, setOrderName, academicYear, setAcademicYear, schoolName, setSchoolName, lastSavedAt
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within OrderProvider');
  return context;
};
