import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Modal,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  SelectChangeEvent
} from '@mui/material';
import { useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { movieService } from '../../services/movieService';
import { Movie, MovieStatus, MovieSearchResult } from '../../types/movie';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { CircularProgress } from '@mui/material';
import { useMovies } from '../../hooks/useMovies';
import { useSearch } from '../../contexts/SearchContext';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import MovieSearchModal from '../shared/MovieSearchModal';
import SearchIcon from '@mui/icons-material/Search';

const STATUS_ORDER: MovieStatus[] = ['watching', 'paused', 'planning', 'completed', 're-watching'];

const MovieTracker: React.FC = () => {
  const { user } = useAuth();
  const { movies: userMovies, loading: moviesLoading, error: moviesError } = useMovies();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
  const [movieDetails, setMovieDetails] = useState<Partial<Movie>>({
    status: 'planning',
    timesWatched: 0,
    rating: 0,
    currentTime: 0
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMovieForEdit, setSelectedMovieForEdit] = useState<Movie | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<MovieStatus[]>(['watching', 'paused', 'planning', 'completed', 're-watching']);
  const [selectedDirectors, setSelectedDirectors] = useState<string[]>([]);
  const [selectedCast, setSelectedCast] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Predefined genres
  const predefinedGenres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
    'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'Biography',
    'Sport', 'Musical', 'Film-Noir', 'Short', 'Adult'
  ];

  // Get all unique genres from movies
  const getAllGenres = () => {
    const movieGenres = new Set<string>();
    userMovies.forEach(movie => {
      if (movie.genres) {
        movie.genres.forEach(genre => movieGenres.add(genre));
      }
    });
    return Array.from(movieGenres);
  };

  // Combine predefined and custom genres
  const allGenres = useMemo(() => {
    const customGenres = getAllGenres();
    const combinedGenres = new Set([...predefinedGenres, ...customGenres]);
    return Array.from(combinedGenres).sort();
  }, [userMovies]);

  useEffect(() => {
    const handleMovieSelected = (event: CustomEvent<MovieSearchResult>) => {
      console.log('Movie selected event received:', event.detail);
      setSelectedMovie(event.detail);
      // Here you can add logic to save the movie to your database
    };

    document.addEventListener('movieSelected', handleMovieSelected as EventListener);
    return () => {
      document.removeEventListener('movieSelected', handleMovieSelected as EventListener);
    };
  }, []);

  // Get unique directors and cast from movies
  const uniqueDirectors = Array.from(new Set(userMovies.map(movie => movie.director)));
  const uniqueCast = Array.from(new Set(userMovies.flatMap(movie => movie.cast || [])));

  const handleEditClick = (movie: Movie) => {
    setSelectedMovieForEdit(movie);
    setSelectedGenres(movie.genres || []);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedMovieForEdit) {
      handleDeleteMovie(selectedMovieForEdit.id);
      setEditDialogOpen(false);
    }
  };

  const handleMovieSelect = (movie: MovieSearchResult) => {
    console.log('handleMovieSelect called with movie:', movie);
    setSelectedMovie(movie);
    setMovieDetails({
      status: 'planning',
      timesWatched: 0,
      rating: 0,
      currentTime: 0
    });
    // Use a small delay to ensure state updates are processed
    setTimeout(() => {
      setDialogOpen(true);
      console.log('Dialog should be open now');
    }, 100);
  };

  const handleAddMovie = async () => {
    if (!user || !selectedMovie) return;

    const runtime = selectedMovie.runtime || 0;
    console.log('Adding movie:', selectedMovie);
    const newMovie: Omit<Movie, 'id' | 'createdAt' | 'updatedAt'> = {
      title: selectedMovie.title,
      director: selectedMovie.director || 'Unknown Director',
      posterUrl: selectedMovie.posterUrl || '',
      backdropUrl: selectedMovie.backdropUrl || '',
      description: selectedMovie.description || '',
      releaseDate: selectedMovie.releaseDate || '',
      runtime: runtime,
      genres: selectedMovie.genres || ['Drama'],
      cast: selectedMovie.cast || [],
      status: movieDetails.status || 'planning',
      currentTime: movieDetails.status === 'completed' ? runtime : movieDetails.currentTime || 0,
      timesWatched: movieDetails.status === 'completed' ? 1 : movieDetails.timesWatched || 0,
      rating: movieDetails.rating || 0,
      userId: user.uid
    };

    try {
      console.log('Sending movie to service:', newMovie);
      await movieService.addMovie(newMovie);
      console.log('Movie added successfully');
      setDialogOpen(false);
      setSelectedMovie(null);
      setMovieDetails({
        status: 'planning',
        timesWatched: 0,
        rating: 0,
        currentTime: 0
      });
      queryClient.invalidateQueries(['movies']);
    } catch (error) {
      console.error('Error adding movie:', error);
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    if (!user) return;

    try {
      await movieService.deleteMovie(movieId);
      // Invalidate the movies query to trigger a re-fetch
      queryClient.invalidateQueries(['movies']);
      // Close the edit dialog
      setEditDialogOpen(false);
      setSelectedMovieForEdit(null);
    } catch (error) {
      console.error('Error deleting movie:', error);
    }
  };

  const handleEditSave = async () => {
    if (!selectedMovieForEdit) return;

    const currentTime = selectedMovieForEdit.status === 'completed' 
      ? selectedMovieForEdit.runtime 
      : selectedMovieForEdit.currentTime;

    const updates = {
      title: selectedMovieForEdit.title,
      director: selectedMovieForEdit.director,
      runtime: selectedMovieForEdit.runtime,
      status: selectedMovieForEdit.status,
      rating: selectedMovieForEdit.rating,
      updatedAt: new Date().toISOString(),
      currentTime,
      timesWatched: selectedMovieForEdit.timesWatched,
      genres: selectedGenres
    };

    try {
      await movieService.updateMovie(selectedMovieForEdit.id, updates);
      setEditDialogOpen(false);
      setSelectedMovieForEdit(null);
      setSelectedGenres([]);
      queryClient.invalidateQueries(['movies']);
    } catch (error) {
      console.error('Error updating movie:', error);
    }
  };

  const handleStatusChange = (status: MovieStatus) => {
    if (!selectedMovieForEdit) return;
    
    const updatedMovie = {
      ...selectedMovieForEdit,
      status,
      currentTime: status === 'completed' ? (selectedMovieForEdit.runtime || 0) : selectedMovieForEdit.currentTime,
      timesWatched: status === 'completed' ? 1 : selectedMovieForEdit.timesWatched
    };
    
    console.log('Updating movie status:', {
      oldStatus: selectedMovieForEdit.status,
      newStatus: status,
      oldTime: selectedMovieForEdit.currentTime,
      newTime: updatedMovie.currentTime,
      runtime: selectedMovieForEdit.runtime
    });
    
    setSelectedMovieForEdit(updatedMovie);
  };

  const handleFilterStatusChange = (status: MovieStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleDirectorChange = (director: string) => {
    setSelectedDirectors(prev =>
      prev.includes(director)
        ? prev.filter(d => d !== director)
        : [...prev, director]
    );
  };

  const handleCastChange = (actor: string) => {
    setSelectedCast(prev =>
      prev.includes(actor)
        ? prev.filter(c => c !== actor)
        : [...prev, actor]
    );
  };

  const handleYearRangeChange = (_event: Event, newValue: number | number[]) => {
    setYearRange(newValue as [number, number]);
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleGenreChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedGenres(event.target.value as string[]);
  };

  const filteredMovies = userMovies
    .filter(movie => selectedStatuses.includes(movie.status))
    .filter(movie => selectedDirectors.length === 0 || selectedDirectors.includes(movie.director))
    .filter(movie => selectedCast.length === 0 || (movie.cast && movie.cast.some(actor => selectedCast.includes(actor))))
    .filter(movie => {
      const year = new Date(movie.releaseDate || '').getFullYear();
      return year >= yearRange[0] && year <= yearRange[1];
    })
    .filter(movie => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        movie.title.toLowerCase().includes(query) ||
        movie.director.toLowerCase().includes(query) ||
        (movie.genres && movie.genres.some(genre => genre.toLowerCase().includes(query)))
      );
    })
    .filter(movie => selectedGenres.length === 0 || (movie.genres && movie.genres.some(genre => selectedGenres.includes(genre))))
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'director':
          comparison = a.director.localeCompare(b.director);
          break;
        case 'year':
          comparison = (new Date(a.releaseDate || '').getFullYear() - new Date(b.releaseDate || '').getFullYear());
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Add a useEffect to log search results for debugging
  useEffect(() => {
    console.log('Search Query:', searchQuery);
    console.log('Filtered Movies:', filteredMovies);
  }, [searchQuery, filteredMovies]);

  const getMoviesByStatus = (status: MovieStatus) => {
    return filteredMovies.filter(movie => movie.status === status);
  };

  const getStatusColor = (status: MovieStatus) => {
    const colors = {
      watching: '#4caf50',
      paused: '#ff9800',
      planning: '#2196f3',
      completed: '#9c27b0',
      're-watching': '#e91e63'
    };
    return colors[status];
  };

  if (moviesLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#1a1a1a'
      }}>
        <CircularProgress sx={{ color: '#0bceaf' }} />
      </Box>
    );
  }

  if (moviesError) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#1a1a1a',
        color: 'white',
        p: 3
      }}>
        <Typography variant="h6" color="error">
          {`Error loading movies: ${moviesError}`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      data-component="movie-tracker"
      sx={{ 
        p: 3,
        height: 'calc(100vh - 64px)',
        mt: '64px',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        scrollbarWidth: 'thin',
        scrollbarColor: '#0bceaf66 #129d870d',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#129d870d',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#0bceaf66',
          borderRadius: '3px',
          '&:hover': {
            background: '#0bceaf99',
          },
        },
      }}
    >
      <Box sx={{ 
        height: '100%',
        overflow: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#0bceaf66 #129d870d',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#129d870d',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#0bceaf66',
          borderRadius: '3px',
          '&:hover': {
            background: '#0bceaf99',
          },
        },
      }}>
        <Container maxWidth="xl">
          <Grid container spacing={3}>
            {/* Filter Sidebar */}
            <Grid item xs={12} md={3}>
              <Box sx={{ 
                bgcolor: '#1a1a1a', 
                borderRadius: '12px', 
                p: 3,
                position: 'sticky',
                top: 24
              }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterListIcon /> Filters
                </Typography>

                {/* Add Movie Button */}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setSearchModalOpen(true)}
                  fullWidth
                  sx={{
                    mb: 3,
                    bgcolor: '#0bceaf',
                    '&:hover': {
                      bgcolor: '#099c85',
                    },
                  }}
                >
                  Add Movie
                </Button>

                {/* Status Filter */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>Status</Typography>
                  <FormGroup>
                    {STATUS_ORDER.map((status) => (
                      <FormControlLabel
                        key={status}
                        control={
                          <Checkbox
                            checked={selectedStatuses.includes(status)}
                            onChange={() => handleFilterStatusChange(status)}
                            sx={{
                              color: 'rgba(255,255,255,0.7)',
                              '&.Mui-checked': {
                                color: '#0bceaf',
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ 
                            color: 'white',
                            textTransform: 'capitalize'
                          }}>
                            {status}
                          </Typography>
                        }
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Genre Filter */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>Genres</Typography>
                  <FormControl fullWidth>
                    <Select
                      multiple
                      value={selectedGenres}
                      onChange={handleGenreChange}
                      renderValue={(selected) => (selected as string[]).join(', ')}
                      sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0bceaf',
                        },
                        '.MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      {allGenres.map((genre) => (
                        <MenuItem key={genre} value={genre}>
                          {genre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Year Range Filter */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>Year Range</Typography>
                  <Slider
                    value={yearRange}
                    onChange={handleYearRangeChange}
                    valueLabelDisplay="auto"
                    min={1900}
                    max={new Date().getFullYear()}
                    sx={{
                      color: '#0bceaf',
                      '& .MuiSlider-thumb': {
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0px 0px 0px 8px rgba(11, 206, 175, 0.16)',
                        },
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                    <Typography variant="body2">{yearRange[0]}</Typography>
                    <Typography variant="body2">{yearRange[1]}</Typography>
                  </Box>
                </Box>

                {/* Sort Controls */}
                <Box>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SortIcon /> Sort By
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value={sortBy}
                      onChange={handleSortChange}
                      sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0bceaf',
                        },
                        '.MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="title">Title</MenuItem>
                      <MenuItem value="director">Director</MenuItem>
                      <MenuItem value="year">Year</MenuItem>
                      <MenuItem value="rating">Rating</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Grid>

            {/* Main Content */}
            <Grid item xs={12} md={9}>
              {/* Search Bar */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="Search movies..."
                  value={searchQuery}
                  onClick={() => setSearchModalOpen(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      bgcolor: '#1a1a1a',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0bceaf',
                      },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />
                    ),
                  }}
                />
              </Box>

              {/* Desktop Table View */}
              <TableContainer component={Paper} sx={{ 
                bgcolor: 'transparent', 
                boxShadow: 'none',
                scrollbarWidth: 'thin',
                scrollbarColor: '#0bceaf66 #129d870d',
                '&::-webkit-scrollbar': {
                  width: '6px',
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#129d870d',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#0bceaf66',
                  borderRadius: '3px',
                  '&:hover': {
                    background: '#0bceaf99',
                  },
                },
              }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="80px" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Poster</TableCell>
                      <TableCell width="20%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Title</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Director</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Genres</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Progress</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Rating</TableCell>
                      <TableCell width="10%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Times Watched</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {STATUS_ORDER.map((status) => 
                      selectedStatuses.includes(status) ? (
                        <React.Fragment key={status}>
                          <TableRow>
                            <TableCell colSpan={7} sx={{ 
                              bgcolor: 'rgba(255,255,255,0.05)',
                              borderColor: 'rgba(255,255,255,0.1)',
                              p: 2
                            }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: getStatusColor(status),
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1
                                }}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)} ({getMoviesByStatus(status).length})
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {getMoviesByStatus(status).map((movie) => (
                            <TableRow
                              key={movie.id}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.05)',
                                },
                              }}
                            >
                              <TableCell width="80px">
                                <Box sx={{ position: 'relative', width: 60, height: 90 }}>
                                  <Avatar
                                    variant="rounded"
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    sx={{ width: '100%', height: '100%' }}
                                  />
                                  <IconButton
                                    size="small"
                                    className="action-menu"
                                    onClick={() => handleEditClick(movie)}
                                    sx={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                      width: 24,
                                      height: 24,
                                      '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                                      },
                                      '& svg': {
                                        color: 'white',
                                        fontSize: '1rem',
                                      },
                                    }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell width="20%">
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {movie.title}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {movie.director || 'Unknown'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {movie.genres?.join(', ') || 'Drama'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                {movie.status === 'watching' || movie.status === 're-watching' || movie.status === 'completed' ? (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'white',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {movie.currentTime} / {movie.runtime} minutes
                                  </Typography>
                                ) : (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'rgba(255,255,255,0.7)',
                                    }}
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell width="15%">
                                <Rating value={movie.rating} readOnly size="small" sx={{ color: '#0bceaf' }} />
                              </TableCell>
                              <TableCell width="10%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {movie.timesWatched || 0} times
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ) : null
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Add/Edit Movie Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Add Movie</DialogTitle>
        <DialogContent>
          {selectedMovie && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={movieDetails.status}
                      label="Status"
                      onChange={(e) => setMovieDetails({
                        ...movieDetails,
                        status: e.target.value as MovieStatus
                      })}
                    >
                      {STATUS_ORDER.map(status => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Time (minutes)"
                    type="number"
                    value={movieDetails.currentTime}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 0 && value <= (selectedMovie.runtime || 0)) {
                        setMovieDetails({
                          ...movieDetails,
                          currentTime: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 0,
                      max: selectedMovie.runtime || 0
                    }}
                    helperText={`Total runtime: ${selectedMovie.runtime || 'Unknown'} minutes`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={movieDetails.rating}
                    onChange={(_, value) => setMovieDetails({
                      ...movieDetails,
                      rating: value || 0
                    })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddMovie} variant="contained" color="primary">
            Add Movie
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Movie Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Edit Movie</DialogTitle>
        <DialogContent>
          {selectedMovieForEdit && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedMovieForEdit.status}
                      label="Status"
                      onChange={(e) => handleStatusChange(e.target.value as MovieStatus)}
                    >
                      {STATUS_ORDER.map(status => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Time (minutes)"
                    type="number"
                    value={selectedMovieForEdit.currentTime}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 0 && value <= (selectedMovieForEdit.runtime || 0)) {
                        setSelectedMovieForEdit({
                          ...selectedMovieForEdit,
                          currentTime: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 0,
                      max: selectedMovieForEdit.runtime || 0
                    }}
                    helperText={`Total runtime: ${selectedMovieForEdit.runtime || 'Unknown'} minutes`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={selectedMovieForEdit.rating}
                    onChange={(_, value) => setSelectedMovieForEdit({
                      ...selectedMovieForEdit,
                      rating: value || 0
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Genres</InputLabel>
                    <Select
                      multiple
                      value={selectedGenres}
                      label="Genres"
                      onChange={handleGenreChange}
                      renderValue={(selected) => (selected as string[]).join(', ')}
                    >
                      {allGenres.map((genre) => (
                        <MenuItem key={genre} value={genre}>
                          {genre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteClick} color="error">
            Delete
          </Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Modal */}
      <MovieSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onMovieSelect={handleMovieSelect}
      />
    </Box>
  );
};

export default MovieTracker; 