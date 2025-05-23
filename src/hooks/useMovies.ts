import { useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { movieService } from '../services/movieService';
import { Movie, MovieStatus } from '../types/movie';

export const useMovies = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: movies = [], isLoading: loading, error } = useQuery<Movie[]>(
    ['movies', user?.uid],
    () => movieService.getUserMovies(user!.uid),
    {
      enabled: !!user,
    }
  );

  const getMoviesByGenre = () => {
    const genreCounts: Record<string, number> = {};
    movies.forEach(movie => {
      if (movie.genres) {
        movie.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    return genreCounts;
  };

  const getMoviesByRating = () => {
    const ratingCounts: Record<number, number> = {};
    movies.forEach(movie => {
      if (movie.rating) {
        const rating = Math.round(movie.rating);
        ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
      }
    });
    return ratingCounts;
  };

  const getMoviesByStatus = () => {
    const statusCounts: Record<MovieStatus, number> = {
      watching: 0,
      planning: 0,
      completed: 0,
      're-watching': 0,
      paused: 0,
    };
    movies.forEach(movie => {
      statusCounts[movie.status]++;
    });
    return statusCounts;
  };

  return {
    movies,
    loading,
    error,
    getMoviesByGenre,
    getMoviesByRating,
    getMoviesByStatus,
  };
}; 