import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Modal, TextField, IconButton, List, ListItem, ListItemAvatar, ListItemText, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Rating, LinearProgress, Stack, Chip, Tooltip } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Pie, Bar } from 'react-chartjs-2';
import { useBooks } from '../../hooks/useBooks';
import { useMovies } from '../../hooks/useMovies';
import { useTVShows } from '../../hooks/useTVShows';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext';
import { useQuery } from 'react-query';
import { bookSearchService } from '../../services/bookSearchService';
import { bookService } from '../../services/bookService';
import { Book, ReadingStatus, BookSearchResult } from '../../types/book';
import { Movie, MovieStatus } from '../../types/movie';
import { TVShow, TVShowStatus } from '../../types/tvshow';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchModal from '../shared/SearchModal';
import { Timestamp } from 'firebase/firestore';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler);

type MediaItem = 
  | (Book & { type: 'book' })
  | (Movie & { type: 'movie' })
  | (TVShow & { type: 'tvshow' });

const Home: React.FC = () => {
  const { books, loading: booksLoading, error: booksError, getBooksByGenre, getBooksByRating, getBooksByStatus } = useBooks();
  const { movies, loading: moviesLoading, error: moviesError } = useMovies();
  const { tvshows, loading: tvshowsLoading, error: tvshowsError } = useTVShows();
  const { user } = useAuth();
  const { openSearchModal } = useSearch();
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookDetails, setBookDetails] = useState<Partial<Book>>({
    status: 'planning',
    timesRead: 0,
    rating: 0,
    currentPage: 0
  });

  useEffect(() => {
    const handleBookSelected = (event: CustomEvent<BookSearchResult>) => {
      console.log('Book selected event received in Home:', event.detail);
      // Ensure we're in the Home component
      if (window.location.pathname === '/') {
        handleBookSelect(event.detail);
      }
    };

    // Add event listener to the document instead of the component
    document.addEventListener('bookSelected', handleBookSelected as EventListener);
    console.log('Event listener added to document in Home');

    return () => {
      document.removeEventListener('bookSelected', handleBookSelected as EventListener);
      console.log('Event listener removed from document in Home');
    };
  }, []); // Remove dialogOpen from dependencies

  const handleBookSelect = (book: BookSearchResult) => {
    console.log('handleBookSelect called in Home with book:', book);
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
      console.log('Dialog should be open now in Home');
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
      openSearchModal();
    } catch (error) {
      console.error('Error adding book:', error);
    }
  };

  if (booksLoading || moviesLoading || tvshowsLoading) {
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

  if (booksError || moviesError || tvshowsError) {
    const errorMessage = typeof booksError === 'object' && booksError !== null ? String(booksError) : 
                        typeof moviesError === 'object' && moviesError !== null ? String(moviesError) :
                        typeof tvshowsError === 'object' && tvshowsError !== null ? String(tvshowsError) :
                        'Unknown error';
    
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
          {`Error loading data: ${errorMessage}`}
        </Typography>
      </Box>
    );
  }

  // Book Statistics
  const completedBooks = books.filter(book => book.status === 'completed');
  const currentlyReading = books.filter(book => book.status === 'reading');
  
  // Movie Statistics
  const completedMovies = movies.filter(movie => movie.status === 'completed');
  const currentlyWatching = movies.filter(movie => movie.status === 'watching');

  // Type guard for Firestore Timestamp
  const isTimestamp = (value: any): value is Timestamp => {
    return value && typeof value === 'object' && 'toDate' in value;
  };

  // Calculate items completed per year
  const getCompletedItemsByYear = (items: (Book | Movie)[]) => {
    const yearCounts: { [key: string]: number } = {};
    
    items.forEach(item => {
      console.log('Item updatedAt:', item.updatedAt, typeof item.updatedAt);
      
      let year: number | undefined;
      try {
        if (isTimestamp(item.updatedAt)) {
          // Handle Firestore Timestamp
          const date = item.updatedAt.toDate();
          year = date.getFullYear();
        } else if (typeof item.updatedAt === 'string') {
          // Try parsing as a date string
          const date = new Date(item.updatedAt);
          if (!isNaN(date.getTime())) {
            year = date.getFullYear();
          }
        } else if (typeof item.updatedAt === 'number') {
          // Handle timestamp
          const date = new Date(item.updatedAt);
          if (!isNaN(date.getTime())) {
            year = date.getFullYear();
          }
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
      
      console.log('Extracted year:', year);
      
      if (year && !isNaN(year)) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    console.log('Final year counts:', yearCounts);
    return yearCounts;
  };

  const booksByYear = getCompletedItemsByYear(completedBooks);
  const moviesByYear = getCompletedItemsByYear(completedMovies);

  // Calculate averages
  const currentYear = new Date().getFullYear();
  console.log('Current year:', currentYear);
  console.log('Books by year:', booksByYear);
  console.log('Movies by year:', moviesByYear);
  
  const booksThisYear = booksByYear[currentYear] || 0;
  const moviesThisYear = moviesByYear[currentYear] || 0;
  
  console.log('Books this year:', booksThisYear);
  console.log('Movies this year:', moviesThisYear);

  // Calculate average for previous years
  const previousYears = Object.keys(booksByYear)
    .map(Number)
    .filter(year => year < currentYear);
  
  console.log('Previous years:', previousYears);
  
  const totalPreviousYears = previousYears.length;
  const totalBooksPreviousYears = previousYears.reduce((sum, year) => sum + (booksByYear[year] || 0), 0);
  const averageBooksPreviousYears = totalPreviousYears > 0 
    ? Math.round(totalBooksPreviousYears / totalPreviousYears) 
    : 0;

  const totalMoviesPreviousYears = previousYears.reduce((sum, year) => sum + (moviesByYear[year] || 0), 0);
  const averageMoviesPreviousYears = totalPreviousYears > 0 
    ? Math.round(totalMoviesPreviousYears / totalPreviousYears) 
    : 0;

  const totalYears = Math.max(
    ...Object.keys(booksByYear).map(Number),
    ...Object.keys(moviesByYear).map(Number)
  ) - Math.min(
    ...Object.keys(booksByYear).map(Number),
    ...Object.keys(moviesByYear).map(Number)
  ) + 1;

  const averageBooksPerYear = totalYears > 0 ? Math.round(completedBooks.length / totalYears) : 0;
  const averageMoviesPerYear = totalYears > 0 ? Math.round(completedMovies.length / totalYears) : 0;

  // Format numbers for display
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Dynamically get all unique genres from completed books
  const allGenresSet = new Set<string>();
  books.forEach(book => {
    if (book.status === 'completed' && Array.isArray(book.genres)) {
      book.genres.forEach(genre => allGenresSet.add(genre));
    }
  });
  const allGenres = Array.from(allGenresSet).sort();

  // Count completed books for each genre
  const userGenreCounts: Record<string, number> = {};
  books.forEach(book => {
    if (book.status === 'completed' && Array.isArray(book.genres)) {
      book.genres.forEach(genre => {
        userGenreCounts[genre] = (userGenreCounts[genre] || 0) + 1;
      });
    }
  });

  // Calculate total completed books for percentage calculation
  const totalCompletedBooks = Object.values(userGenreCounts).reduce((sum, count) => sum + count, 0);

  // Calculate progress for each genre based on completed book count
  const genreProgress = allGenres.map(genre => {
    const bookCount = userGenreCounts[genre] || 0;
    const percentage = totalCompletedBooks > 0 ? (bookCount / totalCompletedBooks) * 100 : 0;
    return {
      genre,
      progress: percentage
    };
  });

  // Chart data and options
  const genreChartData = {
    labels: genreProgress.map(g => g.genre),
    datasets: [
      {
        label: 'Completed Books by Genre',
        data: genreProgress.map(g => g.progress),
        backgroundColor: 'rgba(11, 206, 175, 0.2)',
        borderColor: '#0bceaf',
        borderWidth: 2,
        pointBackgroundColor: '#0bceaf',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#0bceaf',
        fill: true,
        tension: 0,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  console.log('Final genre progress data:', genreProgress);

  const genreChartOptions = {
    scales: {
      r: {
        type: 'radialLinear' as const,
        angleLines: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
          lineWidth: 1
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          circular: false
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'normal' as const
          },
          padding: 20,
          centerPointLabels: true
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          backdropColor: 'transparent',
          callback: function(tickValue: number | string) {
            return `${tickValue}%`;
          },
          stepSize: 25,
          z: 1
        },
        min: 0,
        max: 100,
        beginAtZero: true,
        startAngle: 0,
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw || 0;
            const genre = context.label;
            const count = userGenreCounts[genre] || 0;
            return value > 0 
              ? [`${value.toFixed(1)}% of completed books`, `${count} completed book${count !== 1 ? 's' : ''} in this genre`]
              : ['No completed books in this genre'];
          }
        }
      }
    },
    elements: {
      line: {
        tension: 0,
        borderWidth: 2
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        hitRadius: 10
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuad' as const
    }
  };

  const ratingChartData = {
    labels: Object.keys(getBooksByRating()),
    datasets: [
      {
        label: 'Books by Rating',
        data: Object.values(getBooksByRating()),
        backgroundColor: '#0bceaf',
      },
    ],
  };

  const statusChartData = {
    labels: Object.keys(getBooksByStatus()),
    datasets: [
      {
        data: Object.values(getBooksByStatus()),
        backgroundColor: [
          '#0bceaf',
          '#2c3e50',
          '#e74c3c',
          '#9b59b6',
          '#f39c12'
        ],
        borderColor: '#1a1a1a',
        borderWidth: 2,
        borderRadius: 4,
        barThickness: 40,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#0bceaf',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value} books (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Progress bar colors for different media types
  const mediaColors = {
    book: '#0bceaf',
    movie: '#ff6b6b',
    tvshow: '#4dabf7'
  };

  // Calculate progress percentage
  const calculateProgress = (item: MediaItem) => {
    switch (item.type) {
      case 'book':
        return ((item.currentPage || 0) / (item.pageCount || 1)) * 100;
      case 'movie':
        return ((item.currentTime || 0) / (item.runtime || 1)) * 100;
      case 'tvshow':
        return ((item.currentEpisode || 0) / (item.numberOfEpisodes || 1)) * 100;
      default:
        return 0;
    }
  };

  // Get in-progress items
  const inProgressItems: MediaItem[] = [
    ...books.filter(book => book.status === 'reading').map(book => ({ 
      ...book, 
      type: 'book' as const
    })),
    ...movies.filter(movie => movie.status === 'watching').map(movie => ({ 
      ...movie, 
      type: 'movie' as const
    })),
    ...tvshows.filter(show => show.status === 'watching').map(show => ({ 
      ...show, 
      type: 'tvshow' as const
    }))
  ];

  // Get start date for an item
  const getStartDate = (item: MediaItem): Date => {
    switch (item.type) {
      case 'book':
        return new Date(item.startDate || item.createdAt);
      case 'movie':
        return new Date(item.createdAt);
      case 'tvshow':
        return item.createdAt;
      default:
        return new Date();
    }
  };

  // Get progress text for an item
  const getProgressText = (item: MediaItem): string => {
    switch (item.type) {
      case 'book':
        return `Page ${item.currentPage || 0} / ${item.pageCount || 0}`;
      case 'movie':
        return `${Math.floor(item.currentTime / 60)}m / ${Math.floor(item.runtime / 60)}m`;
      case 'tvshow':
        return `Episode ${item.currentEpisode} / ${item.numberOfEpisodes}`;
      default:
        return '';
    }
  };

  return (
    <Box 
      data-component="home"
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
                  {selectedBook.genres && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Genres: {selectedBook.genres.join(', ')}
                      </Typography>
                    </Box>
                  )}
                  {selectedBook.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Google Books Rating:
                      </Typography>
                      <Rating value={selectedBook.rating} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary">
                        ({selectedBook.rating.toFixed(1)})
                      </Typography>
                    </Box>
                  )}
                  {selectedBook.description && (
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
                      {selectedBook.description}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Reading Status Form */}
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
                      onChange={(e) => setBookDetails({ ...bookDetails, status: e.target.value as ReadingStatus })}
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
                    onChange={(e) => setBookDetails({ ...bookDetails, currentPage: Number(e.target.value) })}
                    disabled={bookDetails.status === 'completed'}
                    helperText={`Total pages: ${selectedBook.pageCount || 'Unknown'}`}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography component="legend">Your Rating</Typography>
                    <Rating
                      value={bookDetails.rating}
                      onChange={(_, value) => setBookDetails({ ...bookDetails, rating: value || 0 })}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Times Read"
                    value={bookDetails.timesRead}
                    onChange={(e) => setBookDetails({ ...bookDetails, timesRead: Number(e.target.value) })}
                    disabled={bookDetails.status === 'completed' || bookDetails.status === 're-reading'}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddBook}
            variant="contained"
            sx={{ bgcolor: '#0bceaf', '&:hover': { bgcolor: '#099c85' } }}
          >
            Add Book
          </Button>
        </DialogActions>
      </Dialog>

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
        <Container maxWidth="lg" sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            {/* Combined Statistics Section */}
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 3, 
                bgcolor: '#1a1a1a', 
                color: 'white',
                background: 'linear-gradient(to bottom right,#000,#000 75%,#0bceaf)!important',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#0bceaf' }}>
                  Reading & Watching Statistics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(completedBooks.length)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Books Completed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(currentlyReading.length)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Currently Reading
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(completedMovies.length)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Movies Completed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(currentlyWatching.length)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Currently Watching
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(booksThisYear)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Books This Year
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(averageBooksPreviousYears)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Avg. Books Previous Years
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(moviesThisYear)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Movies This Year
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#0bceaf',
                        fontWeight: 'bold',
                        textShadow: '0 0 10px rgba(11,206,175,0.3)'
                      }}>
                        {formatNumber(averageMoviesPreviousYears)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Avg. Movies Previous Years
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                height: 500,
                bgcolor: '#1a1a1a', 
                color: 'white',
                position: 'relative',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#0bceaf' }}>
                  Genre Distribution
                </Typography>
                <Box 
                  flex={1} 
                  display="flex" 
                  justifyContent="center" 
                  alignItems="center"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    '& canvas': {
                      maxWidth: '100% !important',
                      maxHeight: '100% !important',
                      width: 'auto !important',
                      height: 'auto !important'
                    }
                  }}
                >
                  <Radar 
                    data={{
                      labels: Array.from(new Set([
                        ...books.flatMap(book => book.genres || []),
                        ...movies.flatMap(movie => movie.genres || []),
                        ...tvshows.flatMap(show => show.genres || [])
                      ])).sort(),
                      datasets: [
                        {
                          label: 'Books',
                          data: Array.from(new Set([
                            ...books.flatMap(book => book.genres || []),
                            ...movies.flatMap(movie => movie.genres || []),
                            ...tvshows.flatMap(show => show.genres || [])
                          ])).map(genre => {
                            const count = books.filter(book => 
                              book.genres?.includes(genre)
                            ).length;
                            const total = books.length;
                            return total > 0 ? (count / total) * 100 : 0;
                          }),
                          backgroundColor: 'rgba(11, 206, 175, 0.2)',
                          borderColor: '#0bceaf',
                          borderWidth: 2,
                          pointBackgroundColor: '#0bceaf',
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: '#0bceaf',
                          fill: true,
                          tension: 0,
                          pointRadius: 4,
                          pointHoverRadius: 6
                        },
                        {
                          label: 'Movies',
                          data: Array.from(new Set([
                            ...books.flatMap(book => book.genres || []),
                            ...movies.flatMap(movie => movie.genres || []),
                            ...tvshows.flatMap(show => show.genres || [])
                          ])).map(genre => {
                            const count = movies.filter(movie => 
                              movie.genres?.includes(genre)
                            ).length;
                            const total = movies.length;
                            return total > 0 ? (count / total) * 100 : 0;
                          }),
                          backgroundColor: 'rgba(255, 107, 107, 0.2)',
                          borderColor: '#ff6b6b',
                          borderWidth: 2,
                          pointBackgroundColor: '#ff6b6b',
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: '#ff6b6b',
                          fill: true,
                          tension: 0,
                          pointRadius: 4,
                          pointHoverRadius: 6
                        },
                        {
                          label: 'TV Shows',
                          data: Array.from(new Set([
                            ...books.flatMap(book => book.genres || []),
                            ...movies.flatMap(movie => movie.genres || []),
                            ...tvshows.flatMap(show => show.genres || [])
                          ])).map(genre => {
                            const count = tvshows.filter(show => 
                              show.genres?.includes(genre)
                            ).length;
                            const total = tvshows.length;
                            return total > 0 ? (count / total) * 100 : 0;
                          }),
                          backgroundColor: 'rgba(77, 171, 247, 0.2)',
                          borderColor: '#4dabf7',
                          borderWidth: 2,
                          pointBackgroundColor: '#4dabf7',
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: '#4dabf7',
                          fill: true,
                          tension: 0,
                          pointRadius: 4,
                          pointHoverRadius: 6
                        }
                      ]
                    }} 
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      layout: {
                        padding: {
                          top: 40,
                          right: 40,
                          bottom: 40,
                          left: 40
                        }
                      },
                      scales: {
                        r: {
                          type: 'radialLinear' as const,
                          angleLines: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.2)',
                            lineWidth: 1
                          },
                          grid: {
                            color: 'rgba(255, 255, 255, 0.2)',
                            circular: true
                          },
                          pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                              size: 14,
                              weight: 'bold' as const
                            },
                            padding: 25,
                            centerPointLabels: true
                          },
                          ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            backdropColor: 'transparent',
                            callback: function(tickValue: number | string) {
                              return `${tickValue}%`;
                            },
                            stepSize: 25,
                            z: 1,
                            font: {
                              size: 12,
                              weight: 'bold' as const
                            }
                          },
                          min: 0,
                          max: 100,
                          beginAtZero: true,
                          startAngle: 0,
                          suggestedMin: 0,
                          suggestedMax: 100
                        }
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'bottom',
                          labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 20,
                            font: {
                              size: 14,
                              weight: 'bold' as const
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          borderColor: '#0bceaf',
                          borderWidth: 1,
                          padding: 12,
                          displayColors: true,
                          callbacks: {
                            label: function(context: any) {
                              const value = context.raw || 0;
                              const genre = context.label;
                              const datasetLabel = context.dataset.label;
                              let count = 0;
                              let total = 0;
                              
                              if (datasetLabel === 'Books') {
                                count = books.filter(book => book.genres?.includes(genre)).length;
                                total = books.length;
                              } else if (datasetLabel === 'Movies') {
                                count = movies.filter(movie => movie.genres?.includes(genre)).length;
                                total = movies.length;
                              } else if (datasetLabel === 'TV Shows') {
                                count = tvshows.filter(show => show.genres?.includes(genre)).length;
                                total = tvshows.length;
                              }
                              
                              return value > 0 
                                ? [`${datasetLabel}: ${value.toFixed(1)}%`, `${count} ${datasetLabel.toLowerCase()} in this genre`]
                                : [`${datasetLabel}: No items in this genre`];
                            }
                          }
                        }
                      },
                      elements: {
                        line: {
                          tension: 0,
                          borderWidth: 2
                        },
                        point: {
                          radius: 5,
                          hoverRadius: 7,
                          hitRadius: 12
                        }
                      },
                      animation: {
                        duration: 1000,
                        easing: 'easeInOutQuad' as const
                      }
                    }} 
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                height: 500,
                bgcolor: '#1a1a1a', 
                color: 'white',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#0bceaf' }}>
                  Currently
                </Typography>
                <Box 
                  flex={1} 
                  display="grid" 
                  gridTemplateColumns="repeat(auto-fill, minmax(100px, 1fr))"
                  gap={2} 
                  p={2}
                  sx={{
                    alignContent: 'start',
                    overflow: 'hidden'
                  }}
                >
                  {/* Books */}
                  {currentlyReading.map((book) => (
                    <Box
                      key={`book-${book.id}`}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '150%',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1,
                        },
                      }}
                    >
                      <img
                        src={book.coverUrl || '/placeholder-cover.jpg'}
                        alt={book.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          padding: '4px 8px',
                          borderRadius: '0 0 4px 4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'white',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.7rem',
                          }}
                        >
                          {book.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.65rem',
                          }}
                        >
                          Page {book.currentPage} of {book.pageCount}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* Movies */}
                  {currentlyWatching.map((movie) => (
                    <Box
                      key={`movie-${movie.id}`}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '150%',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1,
                        },
                      }}
                    >
                      <img
                        src={movie.posterUrl || '/placeholder-cover.jpg'}
                        alt={movie.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          padding: '4px 8px',
                          borderRadius: '0 0 4px 4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'white',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.7rem',
                          }}
                        >
                          {movie.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.65rem',
                          }}
                        >
                          {Math.floor(movie.currentTime / 60)}m / {Math.floor(movie.runtime / 60)}m
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {/* TV Shows */}
                  {tvshows.filter(show => show.status === 'watching').map((show) => (
                    <Box
                      key={`tvshow-${show.id}`}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '150%',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1,
                        },
                      }}
                    >
                      <img
                        src={show.posterUrl || '/placeholder-cover.jpg'}
                        alt={show.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                          padding: '4px 8px',
                          borderRadius: '0 0 4px 4px',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'white',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.7rem',
                          }}
                        >
                          {show.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.7)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.65rem',
                          }}
                        >
                          Episode {show.currentEpisode} of {show.numberOfEpisodes}
                        </Typography>
                      </Box>
                    </Box>
                  ))}

                  {currentlyReading.length === 0 && currentlyWatching.length === 0 && 
                   tvshows.filter(show => show.status === 'watching').length === 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.5)',
                        gridColumn: '1 / -1'
                      }}
                    >
                      <Typography>No items currently in progress</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 400, bgcolor: '#1a1a1a', color: 'white', boxShadow: '0 4px 15px #0bceaf26' }}>
                <Typography variant="h6" gutterBottom>
                  Overview
                </Typography>
                <Box flex={1} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Books Progress */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ color: '#0bceaf', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, bgcolor: '#0bceaf', borderRadius: '50%' }} />
                          Books
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total: {books.length}
                        </Typography>
                      </Box>
                      <Box sx={{ position: 'relative', height: 12, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, overflow: 'hidden' }}>
                        {/* In Progress */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${(currentlyReading.length / books.length) * 100}%`,
                            bgcolor: '#0bceaf',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {currentlyReading.length > 0 && `${currentlyReading.length}`}
                        </Box>
                        {/* Planning */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${(currentlyReading.length / books.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(books.filter(book => book.status === 'planning').length / books.length) * 100}%`,
                            bgcolor: '#2c3e50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {books.filter(book => book.status === 'planning').length > 0 && 
                            `${books.filter(book => book.status === 'planning').length}`}
                        </Box>
                        {/* Completed */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((currentlyReading.length + books.filter(book => book.status === 'planning').length) / books.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(completedBooks.length / books.length) * 100}%`,
                            bgcolor: '#9b59b6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {completedBooks.length > 0 && `${completedBooks.length}`}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          In Progress: {Math.round((currentlyReading.length / books.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Planning: {Math.round((books.filter(book => book.status === 'planning').length / books.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Completed: {Math.round((completedBooks.length / books.length) * 100)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Movies Progress */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ color: '#0bceaf', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, bgcolor: '#0bceaf', borderRadius: '50%' }} />
                          Movies
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total: {movies.length}
                        </Typography>
                      </Box>
                      <Box sx={{ position: 'relative', height: 12, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, overflow: 'hidden' }}>
                        {/* In Progress */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${(currentlyWatching.length / movies.length) * 100}%`,
                            bgcolor: '#0bceaf',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {currentlyWatching.length > 0 && `${currentlyWatching.length}`}
                        </Box>
                        {/* Planning */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${(currentlyWatching.length / movies.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(movies.filter(movie => movie.status === 'planning').length / movies.length) * 100}%`,
                            bgcolor: '#2c3e50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {movies.filter(movie => movie.status === 'planning').length > 0 && 
                            `${movies.filter(movie => movie.status === 'planning').length}`}
                        </Box>
                        {/* Completed */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((currentlyWatching.length + movies.filter(movie => movie.status === 'planning').length) / movies.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(completedMovies.length / movies.length) * 100}%`,
                            bgcolor: '#9b59b6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {completedMovies.length > 0 && `${completedMovies.length}`}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          In Progress: {Math.round((currentlyWatching.length / movies.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Planning: {Math.round((movies.filter(movie => movie.status === 'planning').length / movies.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Completed: {Math.round((completedMovies.length / movies.length) * 100)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* TV Shows Progress */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ color: '#0bceaf', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, bgcolor: '#0bceaf', borderRadius: '50%' }} />
                          TV Shows
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total: {tvshows.length}
                        </Typography>
                      </Box>
                      <Box sx={{ position: 'relative', height: 12, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, overflow: 'hidden' }}>
                        {/* In Progress */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${(tvshows.filter(show => show.status === 'watching').length / tvshows.length) * 100}%`,
                            bgcolor: '#0bceaf',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {tvshows.filter(show => show.status === 'watching').length > 0 && 
                            `${tvshows.filter(show => show.status === 'watching').length}`}
                        </Box>
                        {/* Planning */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${(tvshows.filter(show => show.status === 'watching').length / tvshows.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(tvshows.filter(show => show.status === 'planning').length / tvshows.length) * 100}%`,
                            bgcolor: '#2c3e50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {tvshows.filter(show => show.status === 'planning').length > 0 && 
                            `${tvshows.filter(show => show.status === 'planning').length}`}
                        </Box>
                        {/* Completed */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${((tvshows.filter(show => show.status === 'watching').length + 
                              tvshows.filter(show => show.status === 'planning').length) / tvshows.length) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(tvshows.filter(show => show.status === 'completed').length / tvshows.length) * 100}%`,
                            bgcolor: '#9b59b6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            transition: 'width 0.3s ease'
                          }}
                        >
                          {tvshows.filter(show => show.status === 'completed').length > 0 && 
                            `${tvshows.filter(show => show.status === 'completed').length}`}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          In Progress: {Math.round((tvshows.filter(show => show.status === 'watching').length / tvshows.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Planning: {Math.round((tvshows.filter(show => show.status === 'planning').length / tvshows.length) * 100)}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                          Completed: {Math.round((tvshows.filter(show => show.status === 'completed').length / tvshows.length) * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Progress Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          bgcolor: 'background.paper',
          borderRadius: 2
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
          Currently In Progress
        </Typography>
        
        <Stack spacing={3}>
          {inProgressItems.map((item) => (
            <Box key={`${item.type}-${item.id}`}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={item.type.toUpperCase()} 
                    size="small"
                    sx={{ 
                      bgcolor: mediaColors[item.type as keyof typeof mediaColors],
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                  <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
                    {item.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {Math.round(calculateProgress(item))}%
                </Typography>
              </Box>
              
              <Tooltip title={`${Math.round(calculateProgress(item))}% Complete`}>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress(item)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: mediaColors[item.type as keyof typeof mediaColors],
                      borderRadius: 4
                    }
                  }}
                />
              </Tooltip>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {getProgressText(item)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Started {getStartDate(item).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          ))}
          
          {inProgressItems.length === 0 && (
            <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
              No items in progress. Start reading a book, watching a movie, or binge-watching a TV show!
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default Home; 