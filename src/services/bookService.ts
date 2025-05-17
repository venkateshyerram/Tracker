import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Book, BookList, ReadingStatus } from '../types/book';

export const bookService = {
  // Add a book to user's collection
  async addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log('bookService.addBook - Starting to add book:', book);
    const booksRef = collection(db, 'books');
    console.log('bookService.addBook - Collection reference created');
    
    try {
      const docRef = await addDoc(booksRef, {
        ...book,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('bookService.addBook - Book added successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('bookService.addBook - Error adding book:', error);
      throw error;
    }
  },

  // Update a book
  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    console.log('bookService.updateBook - Starting update for book:', bookId);
    console.log('bookService.updateBook - Updates:', updates);
    
    const bookRef = doc(db, 'books', bookId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    console.log('bookService.updateBook - Update data:', updateData);
    
    try {
      await updateDoc(bookRef, updateData);
      console.log('bookService.updateBook - Book updated successfully');
    } catch (error) {
      console.error('bookService.updateBook - Error updating book:', error);
      throw error;
    }
  },

  // Delete a book
  async deleteBook(bookId: string): Promise<void> {
    const bookRef = doc(db, 'books', bookId);
    await deleteDoc(bookRef);
  },

  // Get all books for a user
  async getUserBooks(userId: string): Promise<Book[]> {
    const booksRef = collection(db, 'books');
    const q = query(booksRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Book));
  },

  // Get books by status
  async getBooksByStatus(userId: string, status: ReadingStatus): Promise<Book[]> {
    const booksRef = collection(db, 'books');
    const q = query(
      booksRef,
      where('userId', '==', userId),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Book));
  },

  // Create a new book list
  async createBookList(list: Omit<BookList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const listsRef = collection(db, 'bookLists');
    const docRef = await addDoc(listsRef, {
      ...list,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update a book list
  async updateBookList(listId: string, updates: Partial<BookList>): Promise<void> {
    const listRef = doc(db, 'bookLists', listId);
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a book list
  async deleteBookList(listId: string): Promise<void> {
    const listRef = doc(db, 'bookLists', listId);
    await deleteDoc(listRef);
  },

  // Get all book lists for a user
  async getUserBookLists(userId: string): Promise<BookList[]> {
    const listsRef = collection(db, 'bookLists');
    const q = query(listsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as BookList));
  },

  // Add a book to a list
  async addBookToList(listId: string, bookId: string): Promise<void> {
    const listRef = doc(db, 'bookLists', listId);
    const listDoc = await getDoc(listRef);
    const list = listDoc.data() as BookList;
    
    if (!list.books.includes(bookId)) {
      await updateDoc(listRef, {
        books: [...list.books, bookId],
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Remove a book from a list
  async removeBookFromList(listId: string, bookId: string): Promise<void> {
    const listRef = doc(db, 'bookLists', listId);
    const listDoc = await getDoc(listRef);
    const list = listDoc.data() as BookList;
    
    await updateDoc(listRef, {
      books: list.books.filter(id => id !== bookId),
      updatedAt: serverTimestamp(),
    });
  },
}; 