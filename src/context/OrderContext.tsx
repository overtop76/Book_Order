import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!user) return;

    // Listen to orders
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => doc.data() as Order);
      // Filter orders based on role if needed. Viewers and Editors can read all in our rules.
      setOrders(ordersList);
    });

    return () => unsubscribe();
  }, [user]);

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
      };

      await setDoc(doc(db, 'orders', orderId), newOrder);
      setCurrentOrder(newOrder);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!currentOrder || books.length === 0) return;
    
    const timer = setTimeout(() => {
      saveOrder(currentOrder.name, currentOrder.academicYear || '', currentOrder.schoolName || '');
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(timer);
  }, [books, currentOrder?.name, currentOrder?.academicYear, currentOrder?.schoolName]);

  const loadOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setCurrentOrder(order);
      setBooks(JSON.parse(order.books));
      setCustomSubjects(order.customSubjects ? JSON.parse(order.customSubjects) : []);
    }
  };

  return (
    <OrderContext.Provider value={{ 
      currentOrder, books, setBooks, customSubjects, setCustomSubjects, saveOrder, loadOrder, orders,
      filterProgram, setFilterProgram, filterGrade, setFilterGrade, filterSubject, setFilterSubject,
      groupBy, setGroupBy, viewMode, setViewMode, isAutoSaving
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
