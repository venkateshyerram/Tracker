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
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { bookService } from '../../services/bookService';
import { Book, ReadingStatus, BookSearchResult } from '../../types/book';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { CircularProgress } from '@mui/material';
import { useBooks } from '../../hooks/useBooks';
import { useSearch } from '../../contexts/SearchContext';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import SearchModal from '../shared/SearchModal';
import { bookSearchService } from '../../services/bookSearchService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`book-tabpanel-${index}`}
      aria-labelledby={`book-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const STATUS_ORDER: ReadingStatus[] = ['reading', 'paused', 'planning', 'completed', 're-reading'];

const Tracker: React.FC = () => {
  const { user } = useAuth();
  const { books: userBooks, loading: booksLoading, error: booksError } = useBooks();
  const { openSearchModal, closeSearchModal } = useSearch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [bookDetails, setBookDetails] = useState<Partial<Book>>({
    status: 'planning',
    timesRead: 0,
    rating: 0,
    currentPage: 0
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<ReadingStatus[]>(['reading', 'paused', 'planning', 'completed', 're-reading']);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Predefined genres
  const predefinedGenres = [
    'Fiction',
    'Non-Fiction',
    'Mystery',
    'Science Fiction',
    'Fantasy',
    'Romance',
    'Thriller',
    'Horror',
    'Biography',
    'History',
    'Science',
    'Technology',
    'Philosophy',
    'Psychology',
    'Self-Help',
    'Business',
    'Poetry',
    'Drama',
    'Comedy',
    'Adventure',
    'Crime',
    'Young Adult',
    'Children',
    'Classic',
    'Contemporary',
    'Literary Fiction',
    'Historical Fiction',
    'Dystopian',
    'Memoir',
    'Cookbook',
    'Art',
    'Music',
    'Sports',
    'Travel',
    'Religion',
    'Spirituality',
    'Education',
    'Reference',
    'Other'
  ];

  // Get all unique genres from books
  const getAllGenres = () => {
    const bookGenres = new Set<string>();
    userBooks.forEach(book => {
      if (book.genres) {
        book.genres.forEach(genre => bookGenres.add(genre));
      }
    });
    return Array.from(bookGenres);
  };

  // Combine predefined and custom genres
  const allGenres = useMemo(() => {
    const customGenres = getAllGenres();
    const combinedGenres = new Set([...predefinedGenres, ...customGenres]);
    return Array.from(combinedGenres).sort();
  }, [userBooks]);

  useEffect(() => {
    const handleBookSelected = (event: CustomEvent<BookSearchResult>) => {
      console.log('Book selected event received:', event.detail);
      // Ensure we're in the Tracker component
      if (window.location.pathname === '/tracker') {
        handleBookSelect(event.detail);
      }
    };

    // Add event listener to the document instead of the component
    document.addEventListener('bookSelected', handleBookSelected as EventListener);
    console.log('Event listener added to document');

    return () => {
      document.removeEventListener('bookSelected', handleBookSelected as EventListener);
      console.log('Event listener removed from document');
    };
  }, []); // Remove dialogOpen from dependencies to prevent unnecessary re-renders

  // Get unique authors from books
  const uniqueAuthors = Array.from(new Set(userBooks.map(book => book.author)));

  const handleEditClick = (book: Book) => {
    setSelectedBookForEdit(book);
    setSelectedGenres(book.genres || []);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    if (selectedBookForEdit) {
      handleDeleteBook(selectedBookForEdit.id);
      setEditDialogOpen(false);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    console.log('handleBookSelect called with book:', book);
    setSelectedBook(book);
    setBookDetails({
      status: 'planning',
      timesRead: 0,
      rating: 0,
      currentPage: 0
    });
    // Use a small delay to ensure state updates are processed
    setTimeout(() => {
      setDialogOpen(true);
      console.log('Dialog should be open now');
    }, 100);
  };

  const handleAddBook = async () => {
    if (!user || !selectedBook) return;

    const pageCount = selectedBook.pageCount || 0;
    console.log('Adding book:', selectedBook);
    const newBook: Omit<Book, 'id' | 'createdAt' | 'updatedAt'> = {
      title: selectedBook.title,
      author: selectedBook.authors?.join(', ') || 'Unknown Author',
      coverUrl: selectedBook.coverUrl || '',
      description: selectedBook.description || '',
      publishedDate: selectedBook.publishedDate || '',
      pageCount: pageCount,
      genres: selectedBook.genres || ['Fiction'],
      status: bookDetails.status || 'planning',
      currentPage: bookDetails.status === 'completed' ? pageCount : bookDetails.currentPage || 0,
      timesRead: bookDetails.status === 'completed' ? 1 : bookDetails.timesRead || 0,
      rating: bookDetails.rating || 0,
      userId: user.uid
    };

    try {
      console.log('Sending book to service:', newBook);
      await bookService.addBook(newBook);
      console.log('Book added successfully');
      setDialogOpen(false);
      setSelectedBook(null);
      setBookDetails({
        status: 'planning',
        timesRead: 0,
        rating: 0,
        currentPage: 0
      });
      queryClient.invalidateQueries(['books']);
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!user) return;

    try {
      await bookService.deleteBook(bookId);
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleEditSave = async () => {
    if (!selectedBookForEdit) return;

    const currentPage = selectedBookForEdit.status === 'completed' 
      ? selectedBookForEdit.pageCount 
      : selectedBookForEdit.currentPage;

    const updates = {
      title: selectedBookForEdit.title,
      author: selectedBookForEdit.author,
      pageCount: selectedBookForEdit.pageCount,
      status: selectedBookForEdit.status,
      rating: selectedBookForEdit.rating,
      updatedAt: new Date().toISOString(),
      currentPage,
      timesRead: selectedBookForEdit.status === 'completed' ? 1 : selectedBookForEdit.timesRead,
      genres: selectedGenres
    };

    try {
      await bookService.updateBook(selectedBookForEdit.id, updates);
      setEditDialogOpen(false);
      setSelectedBookForEdit(null);
      setSelectedGenres([]);
      queryClient.invalidateQueries(['books']);
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleStatusChange = (status: ReadingStatus) => {
    if (!selectedBookForEdit) return;
    
    const updatedBook = {
      ...selectedBookForEdit,
      status,
      currentPage: status === 'completed' ? (selectedBookForEdit.pageCount || 0) : selectedBookForEdit.currentPage,
      timesRead: status === 'completed' ? 1 : selectedBookForEdit.timesRead
    };
    
    console.log('Updating book status:', {
      oldStatus: selectedBookForEdit.status,
      newStatus: status,
      oldPage: selectedBookForEdit.currentPage,
      newPage: updatedBook.currentPage,
      pageCount: selectedBookForEdit.pageCount
    });
    
    setSelectedBookForEdit(updatedBook);
  };

  const handleFilterStatusChange = (status: ReadingStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleAuthorChange = (author: string) => {
    setSelectedAuthors(prev =>
      prev.includes(author)
        ? prev.filter(a => a !== author)
        : [...prev, author]
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

  const filteredBooks = userBooks
    .filter(book => selectedStatuses.includes(book.status))
    .filter(book => selectedAuthors.length === 0 || selectedAuthors.includes(book.author))
    .filter(book => {
      const year = new Date(book.publishedDate || '').getFullYear();
      return year >= yearRange[0] && year <= yearRange[1];
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'year':
          comparison = (new Date(a.publishedDate || '').getFullYear() - new Date(b.publishedDate || '').getFullYear());
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getBooksByStatus = (status: ReadingStatus) => {
    return filteredBooks.filter(book => book.status === status);
  };

  const getStatusColor = (status: ReadingStatus) => {
    switch (status) {
      case 'reading':
        return '#0bceaf';
      case 'completed':
        return '#2c3e50';
      case 'planning':
        return '#e74c3c';
      case 're-reading':
        return '#9b59b6';
      case 'paused':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  if (booksLoading) {
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

  if (booksError) {
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
          Error loading books: {booksError}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      data-component="tracker"
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
        {/* Rest of the component */}
        <Box sx={{ mt: 4 }}>
          <Container maxWidth="lg">
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
                    onClick={openSearchModal}
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
                      {['reading', 'planning', 'completed', 're-reading', 'paused'].map((status) => (
                        <FormControlLabel
                          key={status}
                          control={
                            <Checkbox
                              checked={selectedStatuses.includes(status as ReadingStatus)}
                              onChange={() => handleFilterStatusChange(status as ReadingStatus)}
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

                  {/* Author Filter */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>Authors</Typography>
                    <Box sx={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto',
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
                      <FormGroup>
                        {uniqueAuthors.map((author) => (
                          <FormControlLabel
                            key={author}
                            control={
                              <Checkbox
                                checked={selectedAuthors.includes(author)}
                                onChange={() => handleAuthorChange(author)}
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
                                fontSize: '0.9rem',
                              }}>
                                {author}
                              </Typography>
                            }
                          />
                        ))}
                      </FormGroup>
                    </Box>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'white' }}>{yearRange[0]}</Typography>
                      <Typography sx={{ color: 'white' }}>{yearRange[1]}</Typography>
                    </Box>
                  </Box>

                  {/* Sort Options */}
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
                    <Button
                      onClick={toggleSortOrder}
                      variant="outlined"
                      fullWidth
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.23)',
                        '&:hover': {
                          borderColor: '#0bceaf',
                          bgcolor: 'rgba(11, 206, 175, 0.08)',
                        },
                      }}
                    >
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Books List */}
              <Grid item xs={12} md={9}>
                <Box sx={{ bgcolor: '#1a1a1a', borderRadius: '12px', p: 3 }}>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    My Books
                  </Typography>
                  
                  {/* Mobile Card View */}
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {STATUS_ORDER.map((status) => (
                      selectedStatuses.includes(status) && (
                        <Box key={status} sx={{ mb: 4 }}>
                          <Typography
                            sx={{
                              textTransform: 'capitalize',
                              fontWeight: 'bold',
                              color: 'white',
                              mb: 2,
                              p: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              borderRadius: 1
                            }}
                          >
                            {status} ({getBooksByStatus(status).length})
                          </Typography>
                          <Grid container spacing={2}>
                            {getBooksByStatus(status).map((book) => (
                              <Grid item xs={12} key={book.id}>
                                <Card 
                                  sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    '&:hover': {
                                      bgcolor: 'rgba(255,255,255,0.08)',
                                      '& .action-menu': {
                                        opacity: 1,
                                      },
                                    },
                                  }}
                                >
                                  <CardContent sx={{ p: 2 }}>
                                    <Grid container spacing={2}>
                                      <Grid item xs={4} sm={3}>
                                        <Box sx={{ position: 'relative', width: '100%', paddingTop: '150%' }}>
                                          <Avatar
                                            variant="rounded"
                                            src={book.coverUrl}
                                            alt={book.title}
                                            sx={{ 
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              width: '100%',
                                              height: '100%',
                                              borderRadius: 1
                                            }}
                                          />
                                          <IconButton
                                            size="small"
                                            className="action-menu"
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
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditClick(book);
                                            }}
                                          >
                                            <MoreHorizIcon />
                                          </IconButton>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={8} sm={9}>
                                        <Typography 
                                          variant="h6" 
                                          sx={{ 
                                            color: 'white',
                                            mb: 1,
                                            fontSize: '1rem',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {book.title}
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            color: 'rgba(255,255,255,0.7)',
                                            mb: 1
                                          }}
                                        >
                                          by {book.author}
                                        </Typography>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            color: 'rgba(255,255,255,0.7)',
                                            mb: 1
                                          }}
                                        >
                                          {book.genres?.join(', ') || 'Fiction'}
                                        </Typography>
                                        {(book.status === 'reading' || book.status === 're-reading' || book.status === 'completed') && (
                                          <Typography 
                                            variant="body2" 
                                            sx={{ 
                                              color: 'white',
                                              mb: 1
                                            }}
                                          >
                                            {book.currentPage} / {book.pageCount} pages
                                          </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                          <Rating value={book.rating} readOnly size="small" sx={{ color: '#0bceaf' }} />
                                          <Typography 
                                            variant="body2" 
                                            sx={{ 
                                              color: 'rgba(255,255,255,0.7)',
                                            }}
                                          >
                                            ({book.timesRead || 0} times)
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )
                    ))}
                  </Box>

                  {/* Desktop Table View */}
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                          {STATUS_ORDER.map((status) => (
                            selectedStatuses.includes(status) && (
                              <React.Fragment key={status}>
                                <TableRow>
                                  <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                                    <Box sx={{ mb: 3 }}>
                                      <Box
                                        sx={{
                                          color: 'white',
                                          p: 2,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          mb: 2,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            textTransform: 'capitalize',
                                            fontWeight: 'bold',
                                            color: 'white',
                                          }}
                                        >
                                          {status} ({getBooksByStatus(status).length})
                                        </Typography>
                                      </Box>
                                      {getBooksByStatus(status).map((book) => (
                                        <TableRow
                                          key={book.id}
                                          sx={{
                                            '&:hover': {
                                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                                              '& .action-menu': {
                                                opacity: 1,
                                              },
                                            },
                                            '& td': {
                                              borderColor: 'rgba(255,255,255,0.1)',
                                              color: 'white',
                                              p: 2,
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
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditClick(book);
                                                }}
                                              >
                                                <MoreHorizIcon />
                                              </IconButton>
                                            </Box>
                                          </TableCell>
                                          <TableCell width="20%">
                                            <Typography 
                                              variant="subtitle1" 
                                              sx={{ 
                                                color: 'white',
                                                wordBreak: 'break-word',
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
                                                wordBreak: 'break-word',
                                              }}
                                            >
                                              {book.author}
                                            </Typography>
                                          </TableCell>
                                          <TableCell width="15%">
                                            <Typography 
                                              variant="body2" 
                                              sx={{ 
                                                color: 'rgba(255,255,255,0.7)',
                                                wordBreak: 'break-word',
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
                                                color: 'white',
                                                textAlign: 'center',
                                              }}
                                            >
                                              {book.timesRead || 0}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              </React.Fragment>
                            )
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Container>

          {/* Add Book Dialog */}
          <Dialog 
            open={dialogOpen} 
            onClose={() => setDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            sx={{
              zIndex: 1300
            }}
          >
            <DialogTitle>Add Book to Your List</DialogTitle>
            <DialogContent>
              {selectedBook && (
                <>
                  {/* Book Info Header */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                    <Avatar
                      variant="rounded"
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      sx={{ width: 100, height: 150 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {selectedBook.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        by {selectedBook.authors?.join(', ') || 'Unknown Author'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Published: {selectedBook.publishedDate || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pages: {selectedBook.pageCount || 'Unknown'}
                        </Typography>
                      </Box>
                      {selectedBook.genres && selectedBook.genres.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Genres: {selectedBook.genres.join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Add Book Form */}
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Reading Status
                  </Typography>
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
                          <MenuItem value="reading">Reading</MenuItem>
                          <MenuItem value="planning">Planning to Read</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="re-reading">Re-reading</MenuItem>
                          <MenuItem value="paused">Paused</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Current Page"
                        value={bookDetails.currentPage}
                        onChange={(e) => setBookDetails({
                          ...bookDetails,
                          currentPage: Number(e.target.value)
                        })}
                        disabled={bookDetails.status === 'completed'}
                        helperText={`Total pages: ${selectedBook.pageCount || 'Unknown'}`}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography component="legend">Your Rating</Typography>
                        <Rating
                          value={bookDetails.rating}
                          onChange={(_, value) => setBookDetails({
                            ...bookDetails,
                            rating: value || 0
                          })}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Times Read"
                        value={bookDetails.timesRead}
                        onChange={(e) => setBookDetails({
                          ...bookDetails,
                          timesRead: Number(e.target.value)
                        })}
                        disabled={bookDetails.status === 'completed' || bookDetails.status === 're-reading'}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
              <Button onClick={() => setDialogOpen(false)} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBook}
                variant="contained"
                sx={{ bgcolor: '#0bceaf', '&:hover': { bgcolor: '#099c85' } }}
              >
                Add Book
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Book Dialog */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Book Details</DialogTitle>
            <DialogContent>
              {selectedBookForEdit && (
                <>
                  {/* Book Info Header */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                    <Avatar
                      variant="rounded"
                      src={selectedBookForEdit.coverUrl}
                      alt={selectedBookForEdit.title}
                      sx={{ width: 100, height: 150 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {selectedBookForEdit.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        by {selectedBookForEdit.author}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Published: {selectedBookForEdit.publishedDate || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pages: {selectedBookForEdit.pageCount || 'Unknown'}
                        </Typography>
                      </Box>
                      {selectedBookForEdit.genres && selectedBookForEdit.genres.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Genres: {selectedBookForEdit.genres.join(', ')}
                          </Typography>
                        </Box>
                      )}
                      {selectedBookForEdit.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            color: 'text.secondary',
                          }}
                        >
                          {selectedBookForEdit.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Edit Form */}
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Reading Status
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={selectedBookForEdit.status}
                          label="Status"
                          onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
                        >
                          <MenuItem value="reading">Reading</MenuItem>
                          <MenuItem value="planning">Planning to Read</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="re-reading">Re-reading</MenuItem>
                          <MenuItem value="paused">Paused</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Current Page"
                        value={selectedBookForEdit.currentPage}
                        onChange={(e) => setSelectedBookForEdit({
                          ...selectedBookForEdit,
                          currentPage: Number(e.target.value)
                        })}
                        disabled={selectedBookForEdit.status === 'completed'}
                        helperText={`Total pages: ${selectedBookForEdit.pageCount || 'Unknown'}`}
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
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography component="legend">Your Rating</Typography>
                        <Rating
                          value={selectedBookForEdit.rating}
                          onChange={(_, value) => setSelectedBookForEdit({
                            ...selectedBookForEdit,
                            rating: value || 0
                          })}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Times Read"
                        value={selectedBookForEdit.timesRead}
                        onChange={(e) => setSelectedBookForEdit({
                          ...selectedBookForEdit,
                          timesRead: Number(e.target.value)
                        })}
                        disabled={selectedBookForEdit.status === 'completed' || selectedBookForEdit.status === 're-reading'}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button
                onClick={handleDeleteClick}
                color="error"
                variant="outlined"
              >
                Delete
              </Button>
              <Box>
                <Button onClick={() => setEditDialogOpen(false)} sx={{ mr: 1 }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  variant="contained"
                  sx={{ bgcolor: '#0bceaf', '&:hover': { bgcolor: '#099c85' } }}
                >
                  Save Changes
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default Tracker;