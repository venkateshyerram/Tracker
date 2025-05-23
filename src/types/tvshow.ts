export type TVShowStatus = 'watching' | 'paused' | 'planning' | 'completed' | 're-watching';

export interface TVShow {
  id: string;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  description: string;
  firstAirDate: string;
  lastAirDate?: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  genres: string[];
  createdBy: string[];
  networks: string[];
  status: TVShowStatus;
  currentSeason: number;
  currentEpisode: number;
  timesWatched: number;
  rating: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TVShowSearchResult {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  description?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres?: string[];
  createdBy?: string[];
  networks?: string[];
} 