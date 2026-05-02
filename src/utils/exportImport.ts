import * as XLSX from 'xlsx';
import { Order } from '../context/OrderContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const exportOrdersJSON = (orders: Order[]) => {
  const dataStr = JSON.stringify(orders, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const exportFileDefaultName = `orders_backup_${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', objectUrl);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
};

export const exportOrdersExcel = (orders: Order[]) => {
  const flatOrders = orders.map(order => {
    const { books, ...rest } = order;
    return {
      ...rest,
      customSubjects: JSON.stringify(rest.customSubjects || []),
      creatorPrograms: JSON.stringify(rest.creatorPrograms || []),
      creatorGrades: JSON.stringify(rest.creatorGrades || []),
      creatorSubjects: JSON.stringify(rest.creatorSubjects || []),
    };
  });

  const booksRows: any[] = [];
  orders.forEach(order => {
    if (order.books) {
      order.books.forEach(book => {
        booksRows.push({
          orderId: order.id,
          ...book
        });
      });
    }
  });

  const workbook = XLSX.utils.book_new();
  const worksheetOrders = XLSX.utils.json_to_sheet(flatOrders);
  XLSX.utils.book_append_sheet(workbook, worksheetOrders, 'Orders');
  
  if (booksRows.length > 0) {
    const worksheetBooks = XLSX.utils.json_to_sheet(booksRows);
    XLSX.utils.book_append_sheet(workbook, worksheetBooks, 'Books');
  }

  XLSX.writeFile(workbook, `orders_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const safeJSONParse = (jsonString: string | any, fallback: any = []) => {
  if (!jsonString) return fallback;
  if (typeof jsonString !== 'string') return jsonString;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON string:', jsonString);
    return fallback;
  }
};

export const importOrdersData = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let importedOrders: Order[] = [];
        
        if (file.name.endsWith('.json')) {
          importedOrders = JSON.parse(e.target?.result as string);
        } else if (file.name.endsWith('.xlsx')) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let rawOrders: any[] = [];
          if (workbook.Sheets['Orders']) {
             rawOrders = XLSX.utils.sheet_to_json(workbook.Sheets['Orders']);
          } else if (workbook.SheetNames.length > 0) {
             rawOrders = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          }

          let rawBooks: any[] = [];
          if (workbook.Sheets['Books']) {
            rawBooks = XLSX.utils.sheet_to_json(workbook.Sheets['Books']);
          }

          const booksByOrder = new Map<string, any[]>();
          rawBooks.forEach((book: any) => {
             const { orderId, ...bookDetails } = book;
             if (orderId) {
                if (!booksByOrder.has(orderId)) {
                   booksByOrder.set(orderId, []);
                }
                booksByOrder.get(orderId)!.push(bookDetails);
             }
          });
          
          importedOrders = rawOrders.map((row: any) => {
            let orderBooks = booksByOrder.get(row.id) || safeJSONParse(row.books);
            return {
              ...row,
              books: orderBooks,
              customSubjects: safeJSONParse(row.customSubjects),
              creatorPrograms: safeJSONParse(row.creatorPrograms),
              creatorGrades: safeJSONParse(row.creatorGrades),
              creatorSubjects: safeJSONParse(row.creatorSubjects),
            };
          });
        }

        // Upload to Firestore
        let count = 0;
        for (const order of importedOrders) {
          if (order && order.id) {
            await setDoc(doc(db, 'orders', order.id), order);
            count++;
          }
        }
        resolve(count);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Unsupported file format"));
    }
  });
};
