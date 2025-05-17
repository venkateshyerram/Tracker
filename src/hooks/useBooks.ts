import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Book, ReadingStatus } from '../types/book';

export const useBooks = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useBooks effect - User:', user?.uid);
    
    if (!user) {
      console.log('No user found, clearing books');
      setBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Setting up books query for user:', user.uid);
      const booksQuery = query(
        collection(db, 'books'),
        where('userId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(booksQuery, 
        (snapshot) => {
          console.log('Received snapshot with', snapshot.docs.length, 'books');
          const booksData = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Book[];
          console.log('Processed books data:', booksData);
          
          // Sort the books in memory instead of in the query
          booksData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setBooks(booksData);
          setLoading(false);
        },
        (error) => {
          console.error('Error in books snapshot:', error);
          setError(error.message);
          setLoading(false);
        }
      );

      return () => {
        console.log('Cleaning up books subscription');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up books listener:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setLoading(false);
    }
  }, [user]);

  const getBooksByGenre = () => {
    const genreCount: { [key: string]: number } = {};
    books.forEach((book) => {
      if (book.genres) {
        book.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });
    return genreCount;
  };

  const getBooksByRating = () => {
    const ratingCount: { [key: number]: number } = {};
    books.forEach((book) => {
      if (book.rating !== undefined) {
        ratingCount[book.rating] = (ratingCount[book.rating] || 0) + 1;
      }
    });
    return ratingCount;
  };

  const getBooksByStatus = () => {
    const statusCount: { [key in ReadingStatus]: number } = {
      'reading': 0,
      'planning': 0,
      'completed': 0,
      're-reading': 0,
      'paused': 0
    };
    books.forEach((book) => {
      statusCount[book.status] = (statusCount[book.status] || 0) + 1;
    });
    return statusCount;
  };

  return {
    books,
    loading,
    error,
    getBooksByGenre,
    getBooksByRating,
    getBooksByStatus,
  };
}; 