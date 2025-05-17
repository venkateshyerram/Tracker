import axios from 'axios';

interface BookSearchResult {
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

export const bookSearchService = {
  async searchBooks(query: string): Promise<BookSearchResult[]> {
    const results: BookSearchResult[] = [];
    
    try {
      // Search Google Books
      const googleResults = await this.searchGoogleBooks(query);
      results.push(...googleResults);

      // Search OpenLibrary
      const openLibraryResults = await this.searchOpenLibrary(query);
      results.push(...openLibraryResults);

      // Remove duplicates based on title and author, prioritizing Google Books data
      return this.removeDuplicates(results);
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  },

  async searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${query}`
      );
      
      return (response.data.items || []).map((item: any) => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors,
        coverUrl: item.volumeInfo.imageLinks?.thumbnail,
        description: item.volumeInfo.description,
        publishedDate: item.volumeInfo.publishedDate,
        pageCount: item.volumeInfo.pageCount,
        genres: ['Fiction'], // Default genre
        rating: item.volumeInfo.averageRating,
        source: 'google' as const,
        isbn: item.volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier
      }));
    } catch (error) {
      console.error('Error searching Google Books:', error);
      return [];
    }
  },

  async searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
    try {
      // First, search for books
      const searchResponse = await axios.get(
        `https://openlibrary.org/search.json?q=${query}`
      );
      
      // Get the first 5 results to avoid too many API calls
      const books = searchResponse.data.docs.slice(0, 5);
      
      // Fetch detailed information for each book
      const detailedResults = await Promise.all(
        books.map(async (doc: any) => {
          try {
            // Get work details using the work key
            const workKey = doc.key;
            const workResponse = await axios.get(
              `https://openlibrary.org${workKey}.json`
            );
            
            return {
              id: `ol-${doc.key}`,
              title: doc.title,
              authors: doc.author_name,
              coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
              description: doc.first_sentence?.[0],
              publishedDate: doc.first_publish_year?.toString(),
              pageCount: doc.number_of_pages_median,
              genres: ['Fiction'], // Default genre
              source: 'openlibrary' as const,
              isbn: doc.isbn?.[0]
            };
          } catch (error) {
            console.error('Error fetching work details:', error);
            // Return basic book info if detailed fetch fails
            return {
              id: `ol-${doc.key}`,
              title: doc.title,
              authors: doc.author_name,
              coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
              description: doc.first_sentence?.[0],
              publishedDate: doc.first_publish_year?.toString(),
              pageCount: doc.number_of_pages_median,
              genres: ['Fiction'], // Default genre
              source: 'openlibrary' as const,
              isbn: doc.isbn?.[0]
            };
          }
        })
      );

      return detailedResults;
    } catch (error) {
      console.error('Error searching OpenLibrary:', error);
      return [];
    }
  },

  removeDuplicates(books: BookSearchResult[]): BookSearchResult[] {
    const seen = new Map<string, BookSearchResult>();
    
    books.forEach(book => {
      const key = `${book.title.toLowerCase()}-${book.authors?.join(',').toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.set(key, book);
      } else {
        // If we already have this book, merge the data prioritizing Google Books
        const existingBook = seen.get(key)!;
        if (existingBook.source === 'google') {
          // Keep the existing Google Books data
          return;
        } else if (book.source === 'google') {
          // Replace OpenLibrary data with Google Books data
          seen.set(key, book);
        } else {
          // Both are from OpenLibrary, keep the first one
          return;
        }
      }
    });

    return Array.from(seen.values());
  },

  cleanGenres(genres: string[]): string[] {
    // Common non-genre terms to exclude
    const excludeTerms = [
      'level', 'grade', 'character', 'fiction', 'nonfiction', 'texts', 'plays',
      'criticism', 'interpretation', 'history', 'study', 'teaching', 'adaptations',
      'juvenile', 'children', 'notes', 'aids', 'edition', 'quelle', 'russian',
      'comics', 'books', 'programs', 'films', 'miscellanea', 'drama', 'theatre',
      'literature', 'shakespeare', 'william', '1564-1616'
    ];

    // Common genre categories to keep
    const validGenres = [
      'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Romance',
      'Thriller', 'Horror', 'Biography', 'History', 'Science', 'Technology',
      'Philosophy', 'Psychology', 'Self-Help', 'Business', 'Poetry', 'Drama',
      'Comedy', 'Adventure', 'Crime', 'Young Adult', 'Children', 'Classic',
      'Contemporary', 'Literary Fiction', 'Historical Fiction', 'Dystopian',
      'Memoir', 'Cookbook', 'Art', 'Music', 'Sports', 'Travel', 'Religion',
      'Spirituality', 'Education', 'Reference'
    ];

    return genres
      .map(genre => {
        // Clean up the genre string
        let cleaned = genre
          .toLowerCase()
          .replace(/[^a-z\s]/g, '') // Remove special characters
          .trim()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Check if it's a valid genre
        if (validGenres.includes(cleaned)) {
          return cleaned;
        }

        // Check if it contains any excluded terms
        if (excludeTerms.some(term => cleaned.toLowerCase().includes(term))) {
          return null;
        }

        // If it's a single word and not too long, keep it
        if (cleaned.split(' ').length === 1 && cleaned.length < 20) {
          return cleaned;
        }

        return null;
      })
      .filter((genre): genre is string => 
        genre !== null && 
        genre.length > 0 && 
        !excludeTerms.some(term => genre.toLowerCase().includes(term))
      )
      .filter((genre, index, self) => self.indexOf(genre) === index) // Remove duplicates
      .slice(0, 5); // Limit to 5 genres
  }
}; 