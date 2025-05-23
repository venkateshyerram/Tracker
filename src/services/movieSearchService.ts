import axios from 'axios';
import { TMDB_API_KEY } from '../config/env';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface MovieSearchResult {
  id: string;
  title: string;
  director: string;
  posterUrl: string;
  backdropUrl: string;
  description: string;
  releaseDate: string;
  runtime: number;
  genres: string[];
  cast: string[];
  rating: number;
}

class MovieSearchService {
  async searchMovies(query: string): Promise<MovieSearchResult[]> {
    console.log('Searching movies with query:', query);
    console.log('TMDB API Key present:', !!TMDB_API_KEY);

    if (!TMDB_API_KEY) {
      throw new Error('TMDB API key is not configured. Please check your environment variables.');
    }

    try {
      console.log('Making API request to:', `${TMDB_BASE_URL}/search/movie`, TMDB_API_KEY);
      const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          language: 'en-US',
          include_adult: false
        }
      });

      console.log('Search response:', response.data);
      console.log('Number of results:', response.data.results?.length || 0);

      if (!response.data.results || response.data.results.length === 0) {
        console.log('No results found for query:', query);
        return [];
      }

      const movies = await Promise.all(
        response.data.results.slice(0, 10).map(async (movie: any) => {
          console.log('Getting details for movie:', movie.title);
          // Get additional details for each movie
          const details = await this.getMovieDetails(movie.id);
          return {
            id: movie.id.toString(),
            title: movie.title,
            director: details.director || 'Unknown Director',
            posterUrl: movie.poster_path ? `https://www.themoviedb.org/t/p/w500${movie.poster_path}` : '',
            backdropUrl: movie.backdrop_path ? `https://www.themoviedb.org/t/p/original${movie.backdrop_path}` : '',
            description: movie.overview || '',
            releaseDate: movie.release_date || '',
            runtime: details.runtime || 0,
            genres: details.genres?.map((g: any) => g.name) || [],
            cast: details.cast || [],
            rating: movie.vote_average || 0
          };
        })
      );

      console.log('Processed movies:', movies);
      return movies;
    } catch (error) {
      console.error('Error searching movies:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  }

  private async getMovieDetails(movieId: string) {
    try {
      console.log('Getting details for movie ID:', movieId);
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
          append_to_response: 'credits'
        }
      });

      const movie = response.data;
      const director = movie.credits?.crew?.find((person: any) => person.job === 'Director')?.name;
      const cast = movie.credits?.cast?.slice(0, 5).map((actor: any) => actor.name) || [];
      console.log('Movie details retrieved:', { title: movie.title, director, cast });

      return {
        ...movie,
        director,
        cast
      };
    } catch (error) {
      console.error('Error getting movie details:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  }
}

export const movieSearchService = new MovieSearchService();

export function cleanGenres(genres: string[]): string[] {
  // Common non-genre terms to exclude
  const excludeTerms = [
    'tv', 'series', 'show', 'documentary', 'reality', 'news', 'talk', 'game',
    'sport', 'music', 'concert', 'performance', 'special', 'miniseries'
  ];

  // Common movie genre categories to keep
  const validGenres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
    'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'Biography',
    'Sport', 'Musical', 'Film-Noir', 'Short', 'Adult'
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