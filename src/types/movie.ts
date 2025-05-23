export type MovieStatus = 'watching' | 'paused' | 'planning' | 'completed' | 're-watching';

export interface Movie {
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
  status: MovieStatus;
  currentTime: number;
  timesWatched: number;
  rating: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovieList {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  movies: string[]; // Array of movie IDs
}

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