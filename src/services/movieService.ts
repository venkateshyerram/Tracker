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
import { Movie, MovieList, MovieStatus } from '../types/movie';

export const movieService = {
  // Add a movie to user's collection
  async addMovie(movie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log('movieService.addMovie - Starting to add movie:', movie);
    const moviesRef = collection(db, 'movies');
    console.log('movieService.addMovie - Collection reference created');
    
    try {
      const docRef = await addDoc(moviesRef, {
        ...movie,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('movieService.addMovie - Movie added successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('movieService.addMovie - Error adding movie:', error);
      throw error;
    }
  },

  // Update a movie
  async updateMovie(movieId: string, updates: Partial<Movie>): Promise<void> {
    const movieRef = doc(db, 'movies', movieId);
    await updateDoc(movieRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a movie
  async deleteMovie(movieId: string): Promise<void> {
    const movieRef = doc(db, 'movies', movieId);
    await deleteDoc(movieRef);
  },

  // Get all movies for a user
  async getUserMovies(userId: string): Promise<Movie[]> {
    const moviesRef = collection(db, 'movies');
    const q = query(moviesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Movie));
  },

  // Get movies by status
  async getMoviesByStatus(userId: string, status: MovieStatus): Promise<Movie[]> {
    const moviesRef = collection(db, 'movies');
    const q = query(
      moviesRef,
      where('userId', '==', userId),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Movie));
  },

  // Create a new movie list
  async createMovieList(list: Omit<MovieList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const listsRef = collection(db, 'movieLists');
    const docRef = await addDoc(listsRef, {
      ...list,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update a movie list
  async updateMovieList(listId: string, updates: Partial<MovieList>): Promise<void> {
    const listRef = doc(db, 'movieLists', listId);
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a movie list
  async deleteMovieList(listId: string): Promise<void> {
    const listRef = doc(db, 'movieLists', listId);
    await deleteDoc(listRef);
  },

  // Get all movie lists for a user
  async getUserMovieLists(userId: string): Promise<MovieList[]> {
    const listsRef = collection(db, 'movieLists');
    const q = query(listsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as MovieList));
  },

  // Add a movie to a list
  async addMovieToList(listId: string, movieId: string): Promise<void> {
    const listRef = doc(db, 'movieLists', listId);
    const listDoc = await getDoc(listRef);
    const list = listDoc.data() as MovieList;
    
    if (!list.movies.includes(movieId)) {
      await updateDoc(listRef, {
        movies: [...list.movies, movieId],
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Remove a movie from a list
  async removeMovieFromList(listId: string, movieId: string): Promise<void> {
    const listRef = doc(db, 'movieLists', listId);
    const listDoc = await getDoc(listRef);
    const list = listDoc.data() as MovieList;
    
    await updateDoc(listRef, {
      movies: list.movies.filter(id => id !== movieId),
      updatedAt: serverTimestamp(),
    });
  },
}; 