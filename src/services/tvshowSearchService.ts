import axios from 'axios';
import { TVShowSearchResult } from '../types/tvshow';

const API_KEY = process.env.REACT_APP_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const tvshowSearchService = {
  async searchTVShows(query: string): Promise<TVShowSearchResult[]> {
    try {
      const response = await axios.get(`${BASE_URL}/search/tv`, {
        params: {
          api_key: API_KEY,
          query,
          language: 'en-US',
          include_adult: false
        }
      });

      // Fetch detailed information for each show
      const detailedShows = await Promise.all(
        response.data.results.map(async (show: any) => {
          const details = await this.getTVShowDetails(show.id);
          return {
            id: show.id.toString(),
            title: show.name,
            posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
            backdropUrl: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : undefined,
            description: show.overview,
            firstAirDate: show.first_air_date,
            lastAirDate: show.last_air_date,
            numberOfSeasons: details.number_of_seasons,
            numberOfEpisodes: details.number_of_episodes,
            genres: details.genres.map((genre: any) => genre.name),
            createdBy: details.created_by?.map((creator: any) => creator.name) || [],
            networks: details.networks?.map((network: any) => network.name) || []
          };
        })
      );

      return detailedShows;
    } catch (error) {
      console.error('Error searching TV shows:', error);
      return [];
    }
  },

  async getTVShowDetails(tvId: number): Promise<any> {
    try {
      const response = await axios.get(`${BASE_URL}/tv/${tvId}`, {
        params: {
          api_key: API_KEY,
          language: 'en-US'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching TV show details:', error);
      return {
        number_of_seasons: 1,
        number_of_episodes: 1,
        genres: [],
        created_by: [],
        networks: []
      };
    }
  }
};

// Helper function to map genre IDs to names
const getGenreName = (id: number): string => {
  const genres: { [key: number]: string } = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western'
  };
  return genres[id] || 'Unknown';
}; 