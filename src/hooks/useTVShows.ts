import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { tvshowService } from '../services/tvshowService';
import { TVShow } from '../types/tvshow';

export const useTVShows = () => {
  const { user } = useAuth();

  const { data: tvshows = [], isLoading, error } = useQuery<TVShow[]>(
    ['tvshows', user?.uid],
    () => tvshowService.getTVShowsByUserId(user!.uid),
    {
      enabled: !!user,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  return {
    tvshows,
    loading: isLoading,
    error
  };
}; 