import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import SearchModal from '../shared/SearchModal';
import { Book, ReadingStatus, BookSearchResult } from '../../types/book';

const STATUS_ORDER: ReadingStatus[] = ['reading', 'paused', 'planning', 'completed', 're-reading'];

const BookTracker: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [bookDetails, setBookDetails] = useState({
    status: 'planning' as ReadingStatus,
    currentPage: 0,
    rating: 0,
    timesRead: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ReadingStatus[]>(['reading', 'planning', 'completed']);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<number[]>([1900, new Date().getFullYear()]);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: books = [], isLoading, error } = useQuery<Book[]>(
    ['books', currentUser?.uid],
    async () => {
      if (!currentUser) return [];
      const querySnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'books'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
    },
    {
      enabled: !!currentUser,
    }
  );

  const allGenres = Array.from(new Set(books.flatMap(book => book.genres || [])));

  const getStatusColor = (status: ReadingStatus) => {
    const colors: Record<ReadingStatus, string> = {
      reading: '#4caf50',
      paused: '#ff9800',
      planning: '#2196f3',
      completed: '#9c27b0',
      're-reading': '#e91e63'
    };
    return colors[status];
  };

  const handleFilterStatusChange = (status: ReadingStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleGenreChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedGenres(event.target.value as string[]);
  };

  const handleYearRangeChange = (event: Event, newValue: number | number[]) => {
    setYearRange(newValue as number[]);
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getBooksByStatus = (status: ReadingStatus) => {
    return books
      .filter(book => book.status === status)
      .filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.genres?.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesGenres = selectedGenres.length === 0 || 
          book.genres?.some(genre => selectedGenres.includes(genre));
        const matchesYear = book.publishedDate ? 
          new Date(book.publishedDate).getFullYear() >= yearRange[0] && 
          new Date(book.publishedDate).getFullYear() <= yearRange[1] : true;
        return matchesSearch && matchesGenres && matchesYear;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'author':
            comparison = (a.author || '').localeCompare(b.author || '');
            break;
          case 'year':
            comparison = (new Date(a.publishedDate || '').getTime()) - (new Date(b.publishedDate || '').getTime());
            break;
          case 'rating':
            comparison = (a.rating || 0) - (b.rating || 0);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  };

  const handleAddBook = async () => {
    if (!currentUser || !selectedBook) return;

    try {
      const bookData = {
        ...selectedBook,
        ...bookDetails,
        userId: currentUser.uid,
        addedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'books'), bookData);
      setDialogOpen(false);
      setSelectedBook(null);
      setBookDetails({
        status: 'planning',
        currentPage: 0,
        rating: 0,
        timesRead: 0
      });
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const handleEditClick = (book: Book) => {
    setSelectedBookForEdit(book);
    setSelectedGenres(book.genres || []);
    setEditDialogOpen(true);
  };

  const handleStatusChange = (newStatus: ReadingStatus) => {
    if (!selectedBookForEdit) return;
    setSelectedBookForEdit({
      ...selectedBookForEdit,
      status: newStatus
    });
  };

  const handleEditSave = async () => {
    if (!currentUser || !selectedBookForEdit) return;

    try {
      const bookRef = doc(db, 'users', currentUser.uid, 'books', selectedBookForEdit.id);
      await updateDoc(bookRef, {
        ...selectedBookForEdit,
        genres: selectedGenres,
        updatedAt: new Date().toISOString(),
      });
      setEditDialogOpen(false);
      setSelectedBookForEdit(null);
      setSelectedGenres([]);
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleDeleteClick = async () => {
    if (!currentUser || !selectedBookForEdit) return;

    try {
      const bookRef = doc(db, 'users', currentUser.uid, 'books', selectedBookForEdit.id);
      await deleteDoc(bookRef);
      setEditDialogOpen(false);
      setSelectedBookForEdit(null);
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    setBookDetails({
      status: 'planning',
      currentPage: 0,
      rating: 0,
      timesRead: 0
    });
    setDialogOpen(true);
  };

  if (isLoading) {
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

  if (error) {
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
          {`Error loading books: ${error}`}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      data-component="book-tracker"
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

                {/* Add Book Button */}
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
                  Add Book
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
                      <MenuItem value="author">Author</MenuItem>
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
                  placeholder="Search books..."
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
                      <TableCell width="80px" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Cover</TableCell>
                      <TableCell width="20%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Title</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Author</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Genres</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Progress</TableCell>
                      <TableCell width="15%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Rating</TableCell>
                      <TableCell width="10%" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>Times Read</TableCell>
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
                                {status.charAt(0).toUpperCase() + status.slice(1)} ({getBooksByStatus(status).length})
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {getBooksByStatus(status).map((book) => (
                            <TableRow
                              key={book.id}
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
                                    src={book.coverUrl}
                                    alt={book.title}
                                    sx={{ width: '100%', height: '100%' }}
                                  />
                                  <IconButton
                                    size="small"
                                    className="action-menu"
                                    onClick={() => handleEditClick(book)}
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
                                  {book.title}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {book.author || 'Unknown'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {book.genres?.join(', ') || 'Fiction'}
                                </Typography>
                              </TableCell>
                              <TableCell width="15%">
                                {book.status === 'reading' || book.status === 're-reading' || book.status === 'completed' ? (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: 'white',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {book.currentPage} / {book.pageCount} pages
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
                                <Rating value={book.rating} readOnly size="small" sx={{ color: '#0bceaf' }} />
                              </TableCell>
                              <TableCell width="10%">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  {book.timesRead || 0} times
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

      {/* Add/Edit Book Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Add Book</DialogTitle>
        <DialogContent>
          {selectedBook && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={bookDetails.status}
                      label="Status"
                      onChange={(e) => setBookDetails({
                        ...bookDetails,
                        status: e.target.value as ReadingStatus
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
                    label="Current Page"
                    type="number"
                    value={bookDetails.currentPage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 0 && value <= (selectedBook.pageCount || 0)) {
                        setBookDetails({
                          ...bookDetails,
                          currentPage: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 0,
                      max: selectedBook.pageCount || 0
                    }}
                    helperText={`Total pages: ${selectedBook.pageCount || 'Unknown'}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={bookDetails.rating}
                    onChange={(_, value) => setBookDetails({
                      ...bookDetails,
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
          <Button onClick={handleAddBook} variant="contained" color="primary">
            Add Book
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle>Edit Book</DialogTitle>
        <DialogContent>
          {selectedBookForEdit && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedBookForEdit.status}
                      label="Status"
                      onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
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
                    label="Current Page"
                    type="number"
                    value={selectedBookForEdit.currentPage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 0 && value <= (selectedBookForEdit.pageCount || 0)) {
                        setSelectedBookForEdit({
                          ...selectedBookForEdit,
                          currentPage: value
                        });
                      }
                    }}
                    inputProps={{
                      min: 0,
                      max: selectedBookForEdit.pageCount || 0
                    }}
                    helperText={`Total pages: ${selectedBookForEdit.pageCount || 'Unknown'}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography component="legend">Rating</Typography>
                  <Rating
                    value={selectedBookForEdit.rating}
                    onChange={(_, value) => setSelectedBookForEdit({
                      ...selectedBookForEdit,
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
      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onBookSelect={handleBookSelect}
      />
    </Box>
  );
};

export default BookTracker; 