import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Modal, TextField, IconButton, List, ListItem, ListItemAvatar, ListItemText, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Rating } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Pie, Bar } from 'react-chartjs-2';
import { useBooks } from '../../hooks/useBooks';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext';
import { useQuery } from 'react-query';
import { bookSearchService } from '../../services/bookSearchService';
import { bookService } from '../../services/bookService';
import { Book, ReadingStatus, BookSearchResult } from '../../types/book';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchModal from '../shared/SearchModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler);

const Home: React.FC = () => {
  const { books, loading, error, getBooksByGenre, getBooksByRating, getBooksByStatus } = useBooks();
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

  if (loading) {
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
          Error loading books: {error}
        </Typography>
      </Box>
    );
  }

  const genreData = getBooksByGenre();
  const ratingData = getBooksByRating();
  const statusData = getBooksByStatus();

  console.log('Raw books data:', books);
  console.log('Raw genre data:', genreData);

  // Calculate reading statistics
  const completedBooks = books.filter(book => book.status === 'completed');
  const currentlyReading = books.filter(book => book.status === 'reading');
  const totalPagesRead = completedBooks.reduce((sum, book) => sum + (book.pageCount || 0), 0);
  
  // Calculate total reading days from account creation
  const accountCreationDate = user?.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
  const today = new Date();
  const totalReadingDays = Math.ceil((today.getTime() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const averagePagesPerDay = totalReadingDays > 0 ? Math.round(totalPagesRead / totalReadingDays) : 0;
  const averageBookLength = completedBooks.length > 0 ? Math.round(totalPagesRead / completedBooks.length) : 0;
  const averageRating = completedBooks.length > 0 
    ? (completedBooks.reduce((sum, book) => sum + (book.rating || 0), 0) / completedBooks.length).toFixed(1)
    : 0;

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
    labels: Object.keys(ratingData).map(rating => `${rating} Stars`),
    datasets: [
      {
        label: 'Books by Rating',
        data: Object.values(ratingData),
        backgroundColor: '#0bceaf',
      },
    ],
  };

  const statusChartData = {
    labels: Object.keys(statusData),
    datasets: [
      {
        data: Object.values(statusData),
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
            {/* Reading Statistics Section */}
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 3, 
                bgcolor: '#1a1a1a', 
                color: 'white',
                background: 'linear-gradient(to bottom right,#000,#000 75%,#0bceaf)!important',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#0bceaf' }}>
                  Reading Statistics
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
                        {formatNumber(totalPagesRead)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Total Pages Read
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
                        {formatNumber(averagePagesPerDay)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Pages Per Day
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
                        {formatNumber(totalReadingDays)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Days Since Joining
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
                        {formatNumber(averageBookLength)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Avg. Book Length
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
                        {averageRating}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Average Rating
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
                        {formatNumber(books.length)}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.7)',
                        mt: 1
                      }}>
                        Total Books
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
                height: 400, 
                bgcolor: '#1a1a1a', 
                color: 'white',
                position: 'relative',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h6" gutterBottom>
                  Books by Genre
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
                    data={genreChartData} 
                    options={{
                      ...genreChartOptions,
                      maintainAspectRatio: false,
                      responsive: true,
                      layout: {
                        padding: {
                          top: 20,
                          right: 20,
                          bottom: 20,
                          left: 20
                        }
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
                height: 400, 
                bgcolor: '#1a1a1a', 
                color: 'white',
                overflow: 'auto',
                boxShadow: '0 4px 15px #0bceaf26'
              }}>
                <Typography variant="h6" gutterBottom>
                  Currently Reading
                </Typography>
                <Box 
                  flex={1} 
                  display="flex" 
                  flexWrap="wrap" 
                  gap={2} 
                  p={2}
                  sx={{
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
                  {currentlyReading.map((book) => (
                    <Box
                      key={book.id}
                      sx={{
                        position: 'relative',
                        width: 120,
                        height: 180,
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
                          }}
                        >
                          Page {book.currentPage} of {book.pageCount}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {currentlyReading.length === 0 && (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <Typography>No books currently being read</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 400, bgcolor: '#1a1a1a', color: 'white', boxShadow: '0 4px 15px #0bceaf26' }}>
                <Typography variant="h6" gutterBottom>
                  Reading Status
                </Typography>
                <Box flex={1} display="flex" justifyContent="center" alignItems="center" sx={{ p: 2 }}>
                  <Bar data={statusChartData} options={statusChartOptions} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Home; 