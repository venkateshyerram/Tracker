export type ReadingStatus = 'reading' | 'planning' | 'completed' | 're-reading' | 'paused';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  genres?: string[];
  rating?: number;
  status: ReadingStatus;
  timesRead: number;
  currentPage?: number;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookList {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  books: string[]; // Array of book IDs
}

export interface BookSearchResult {
  id: string;
  title: string;
  authors?: string[];
  coverUrl?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  genres?: string[];
  rating?: number;
  source: 'google' | 'openlibrary' | 'goodreads';
  isbn?: string;
} 