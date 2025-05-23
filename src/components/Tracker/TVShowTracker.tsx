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
import { tvshowService } from '../../services/tvshowService';
import { TVShow, TVShowStatus, TVShowSearchResult } from '../../types/tvshow';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { CircularProgress } from '@mui/material';
import { useTVShows } from '../../hooks/useTVShows';
import { useSearch } from '../../contexts/SearchContext';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import TVShowSearchModal from '../shared/TVShowSearchModal';

const STATUS_ORDER: TVShowStatus[] = ['watching', 'paused', 'planning', 'completed', 're-watching'];

const TVShowTracker: React.FC = () => {
  const { user } = useAuth();
  const { tvshows: userTVShows, loading: tvshowsLoading, error: tvshowsError } = useTVShows();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTVShow, setSelectedTVShow] = useState<TVShowSearchResult | null>(null);
  const [tvshowDetails, setTVShowDetails] = useState<Partial<TVShow>>({
    status: 'planning',
    timesWatched: 0,
    rating: 0,
    currentSeason: 1,
    currentEpisode: 1
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTVShowForEdit, setSelectedTVShowForEdit] = useState<TVShow | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<TVShowStatus[]>(['watching', 'paused', 'planning', 'completed', 're-watching']);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [sortBy, setSortBy] = useState<'title' | 'firstAirDate' | 'rating'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Predefined genres
  const predefinedGenres = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
    'Romance', 'Science Fiction', 'Thriller', 'War', 'Western', 'Biography',
    'Sport', 'Musical', 'Reality', 'Talk Show', 'Game Show', 'News'
  ];

  // Get all unique genres from TV shows
  const getAllGenres = () => {
    const tvshowGenres = new Set<string>();
    userTVShows.forEach(tvshow => {
      if (tvshow.genres) {
        tvshow.genres.forEach(genre => tvshowGenres.add(genre));
      }
    });
    return Array.from(tvshowGenres);
  };

  // Combine predefined and custom genres
  const allGenres = useMemo(() => {
    const customGenres = getAllGenres();
    const combinedGenres = new Set([...predefinedGenres, ...customGenres]);
    return Array.from(combinedGenres).sort();
  }, [userTVShows]);

  // Get unique creators and networks from TV shows
  const uniqueCreators = Array.from(new Set(userTVShows.flatMap(tvshow => tvshow.createdBy || [])));
  const uniqueNetworks = Array.from(new Set(userTVShows.flatMap(tvshow => tvshow.networks || [])));

  const handleEditClick = (tvshow: TVShow) => {
    setSelectedTVShowForEdit(tvshow);
    setSelectedGenres(tvshow.genres || []);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedTVShowForEdit) {
      handleDeleteTVShow(selectedTVShowForEdit.id);
      setEditDialogOpen(false);
    }
  };

  const handleTVShowSelect = (tvshow: TVShowSearchResult) => {
    setSelectedTVShow(tvshow);
    setTVShowDetails({
      status: 'planning',
      timesWatched: 0,
      rating: 0,
      currentSeason: 1,
      currentEpisode: 1
    });
    setDialogOpen(true);
  };

  const handleAddTVShow = async () => {
    if (!user || !selectedTVShow) return;

    // Calculate episodes per season
    const episodesPerSeason = Math.ceil((selectedTVShow.numberOfEpisodes || 1) / (selectedTVShow.numberOfSeasons || 1));

    const newTVShow: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'> = {
      title: selectedTVShow.title,
      posterUrl: selectedTVShow.posterUrl || '',
      backdropUrl: selectedTVShow.backdropUrl || '',
      description: selectedTVShow.description || '',
      firstAirDate: selectedTVShow.firstAirDate || '',
      lastAirDate: selectedTVShow.lastAirDate || '',
      numberOfSeasons: selectedTVShow.numberOfSeasons || 1,
      numberOfEpisodes: selectedTVShow.numberOfEpisodes || 1,
      genres: selectedTVShow.genres || ['Drama'],
      createdBy: selectedTVShow.createdBy || [],
      networks: selectedTVShow.networks || [],
      status: tvshowDetails.status || 'planning',
      // When status is completed, set current episode to the last episode of the last season
      currentEpisode: tvshowDetails.status === 'completed' ? episodesPerSeason : tvshowDetails.currentEpisode || 1,
      // When status is completed, set current season to the last season
      currentSeason: tvshowDetails.status === 'completed' ? selectedTVShow.numberOfSeasons || 1 : tvshowDetails.currentSeason || 1,
      timesWatched: tvshowDetails.timesWatched || 0,
      rating: tvshowDetails.rating || 0,
      userId: user.uid
    };

    try {
      await tvshowService.addTVShow(newTVShow);
      setDialogOpen(false);
      setSelectedTVShow(null);
      setTVShowDetails({
        status: 'planning',
        timesWatched: 0,
        rating: 0,
        currentSeason: 1,
        currentEpisode: 1
      });
      queryClient.invalidateQueries(['tvshows']);
    } catch (error) {
      console.error('Error adding TV show:', error);
    }
  };

  const handleDeleteTVShow = async (tvshowId: string) => {
    try {
      await tvshowService.deleteTVShow(tvshowId);
      queryClient.invalidateQueries(['tvshows']);
    } catch (error) {
      console.error('Error deleting TV show:', error);
    }
  };

  const handleEditSave = async () => {
    if (!selectedTVShowForEdit) return;

    const updatedTVShow: Partial<TVShow> = {
      ...selectedTVShowForEdit,
      genres: selectedGenres,
      updatedAt: new Date()
    };

    try {
      await tvshowService.updateTVShow(selectedTVShowForEdit.id, updatedTVShow);
      setEditDialogOpen(false);
      queryClient.invalidateQueries(['tvshows']);
    } catch (error) {
      console.error('Error updating TV show:', error);
    }
  };

  const handleStatusChange = (status: TVShowStatus) => {
    if (selectedTVShowForEdit) {
      // Calculate episodes per season
      const episodesPerSeason = Math.ceil(selectedTVShowForEdit.numberOfEpisodes / selectedTVShowForEdit.numberOfSeasons);
      
      setSelectedTVShowForEdit({
        ...selectedTVShowForEdit,
        status,
        // When status is changed to completed, set current episode to the last episode of the last season
        currentEpisode: status === 'completed' ? episodesPerSeason : selectedTVShowForEdit.currentEpisode,
        // When status is changed to completed, set current season to the last season
        currentSeason: status === 'completed' ? selectedTVShowForEdit.numberOfSeasons : selectedTVShowForEdit.currentSeason
      });
    }
  };

  const handleFilterStatusChange = (status: TVShowStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleCreatorChange = (creator: string) => {
    setSelectedCreators(prev =>
      prev.includes(creator)
        ? prev.filter(c => c !== creator)
        : [...prev, creator]
    );
  };

  const handleNetworkChange = (network: string) => {
    setSelectedNetworks(prev =>
      prev.includes(network)
        ? prev.filter(n => n !== network)
        : [...prev, network]
    );
  };

  const handleYearRangeChange = (_event: Event, newValue: number | number[]) => {
    setYearRange(newValue as [number, number]);
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value as 'title' | 'firstAirDate' | 'rating');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleGenreChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedGenres(typeof value === 'string' ? value.split(',') : value);
  };

  const getTVShowsByStatus = (status: TVShowStatus) => {
    return filteredTVShows.filter(tvshow => tvshow.status === status);
  };

  const getStatusColor = (status: TVShowStatus) => {
    const colors = {
      watching: '#4caf50',
      paused: '#ff9800',
      planning: '#2196f3',
      completed: '#9c27b0',
      're-watching': '#e91e63'
    };
    return colors[status];
  };

  const filteredTVShows = userTVShows
    .filter(tvshow => selectedStatuses.includes(tvshow.status))
    .filter(tvshow => selectedCreators.length === 0 || (tvshow.createdBy && tvshow.createdBy.some(creator => selectedCreators.includes(creator))))
    .filter(tvshow => selectedNetworks.length === 0 || (tvshow.networks && tvshow.networks.some(network => selectedNetworks.includes(network))))
    .filter(tvshow => {
      const year = new Date(tvshow.firstAirDate || '').getFullYear();
      return year >= yearRange[0] && year <= yearRange[1];
    })
    .filter(tvshow => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        tvshow.title.toLowerCase().includes(query) ||
        (tvshow.createdBy && tvshow.createdBy.some(creator => creator.toLowerCase().includes(query))) ||
        (tvshow.genres && tvshow.genres.some(genre => genre.toLowerCase().includes(query)))
      );
    })
    .filter(tvshow => selectedGenres.length === 0 || (tvshow.genres && tvshow.genres.some(genre => selectedGenres.includes(genre))))
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'firstAirDate':
          comparison = new Date(a.firstAirDate || '').getTime() - new Date(b.firstAirDate || '').getTime();
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (tvshowsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (tvshowsError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">Error loading TV shows</Typography>
      </Box>
    );
  }

  return (
    <Box 
      data-component="tvshow-tracker"
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

                {/* Add TV Show Button */}
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
                  Add TV Show
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
                      <MenuItem value="firstAirDate">Air Date</MenuItem>
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
                  placeholder="Search TV shows..."
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
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Created By</TableCell>
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
                                {status.charAt(0).toUpperCase() + status.slice(1)} ({getTVShowsByStatus(status).length})
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {getTVShowsByStatus(status).map((tvshow) => (
                            <TableRow
                              key={tvshow.id}
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
                                    src={tvshow.posterUrl}
                                    alt={tvshow.title}
                                    sx={{ width: '100%', height: '100%' }}
                                  />
                                  <IconButton
                                    size="small"
                                    className="action-menu"
                                    onClick={() => handleEditClick(tvshow)}
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
                                  {tvshow.title}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {tvshow.createdBy?.join(', ') || 'Unknown'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {tvshow.genres?.join(', ') || 'No genres'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                {tvshow.status === 'watching' || tvshow.status === 're-watching' || tvshow.status === 'completed' ? (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'white',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Season {tvshow.currentSeason} Episode {tvshow.currentEpisode}
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
                                <Rating value={tvshow.rating} readOnly size="small" sx={{ color: '#0bceaf' }} />
                              </TableCell>
                              <TableCell width="10%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {tvshow.timesWatched || 0} times
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

      {/* Add/Edit TV Show Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Add TV Show</DialogTitle>
        <DialogContent>
          {selectedTVShow && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={tvshowDetails.status}
                      label="Status"
                      onChange={(e) => setTVShowDetails({
                        ...tvshowDetails,
                        status: e.target.value as TVShowStatus
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
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Current Season"
                    type="number"
                    value={tvshowDetails.currentSeason}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= (selectedTVShow.numberOfSeasons || 1)) {
                        setTVShowDetails({
                          ...tvshowDetails,
                          currentSeason: value,
                          // Reset episode to 1 when changing seasons
                          currentEpisode: 1
                        });
                      }
                    }}
                    inputProps={{
                      min: 1,
                      max: selectedTVShow.numberOfSeasons || 1
                    }}
                    helperText={`Total Seasons: ${selectedTVShow.numberOfSeasons || 1}`}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Current Episode"
                    type="number"
                    value={tvshowDetails.currentEpisode}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= (selectedTVShow.numberOfEpisodes || 1)) {
                        setTVShowDetails({
                          ...tvshowDetails,
                          currentEpisode: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 1,
                      max: selectedTVShow.numberOfEpisodes || 1
                    }}
                    helperText={`Episodes per Season: ${selectedTVShow.numberOfEpisodes || 1}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={tvshowDetails.rating}
                    onChange={(_, value) => setTVShowDetails({
                      ...tvshowDetails,
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
          <Button onClick={handleAddTVShow} variant="contained" color="primary">
            Add TV Show
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit TV Show Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Edit TV Show</DialogTitle>
        <DialogContent>
          {selectedTVShowForEdit && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedTVShowForEdit.status}
                      label="Status"
                      onChange={(e) => handleStatusChange(e.target.value as TVShowStatus)}
                    >
                      {STATUS_ORDER.map(status => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Current Season"
                    type="number"
                    value={selectedTVShowForEdit.currentSeason}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= (selectedTVShowForEdit.numberOfSeasons || 1)) {
                        setSelectedTVShowForEdit({
                          ...selectedTVShowForEdit,
                          currentSeason: value,
                          // Reset episode to 1 when changing seasons
                          currentEpisode: 1
                        });
                      }
                    }}
                    inputProps={{
                      min: 1,
                      max: selectedTVShowForEdit.numberOfSeasons || 1
                    }}
                    helperText={`Total Seasons: ${selectedTVShowForEdit.numberOfSeasons || 1}`}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Current Episode"
                    type="number"
                    value={selectedTVShowForEdit.currentEpisode}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= (selectedTVShowForEdit.numberOfEpisodes || 1)) {
                        setSelectedTVShowForEdit({
                          ...selectedTVShowForEdit,
                          currentEpisode: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 1,
                      max: selectedTVShowForEdit.numberOfEpisodes || 1
                    }}
                    helperText={`Episodes per Season: ${selectedTVShowForEdit.numberOfEpisodes || 1}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={selectedTVShowForEdit.rating}
                    onChange={(_, value) => setSelectedTVShowForEdit({
                      ...selectedTVShowForEdit,
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
      <TVShowSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onTVShowSelect={handleTVShowSelect}
      />
    </Box>
  );
};

export default TVShowTracker; 