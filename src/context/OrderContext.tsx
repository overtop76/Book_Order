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
  saveOrder: (name: string, academicYear: string, schoolName: string) => Promise<void>;
  loadOrder: (orderId: string) => void;
  orders: Order[];
}

const OrderContext = createContext<OrderContextType | null>(null);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

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
    
    const orderId = currentOrder?.id || `order_${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      name,
      academicYear,
      schoolName,
      books: JSON.stringify(books),
      customSubjects: JSON.stringify([]), // Simplified for now
      createdBy: user.uid,
      createdAt: currentOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'orders', orderId), newOrder);
    setCurrentOrder(newOrder);
  };

  const loadOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setCurrentOrder(order);
      setBooks(JSON.parse(order.books));
    }
  };

  return (
    <OrderContext.Provider value={{ currentOrder, books, setBooks, saveOrder, loadOrder, orders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within OrderProvider');
  return context;
};
