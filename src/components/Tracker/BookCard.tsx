import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Rating,
  Chip,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Book, ReadingStatus } from '../../types/book';
import { bookService } from '../../services/bookService';

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onUpdate: (updatedBook: Book) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onDelete, onUpdate }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookDetails, setBookDetails] = useState<Partial<Book>>({
    status: book.status,
    currentPage: book.currentPage || 0,
    timesRead: book.timesRead,
    rating: book.rating || 0
  });

  const handleOpenDialog = () => {
    setBookDetails({
      status: book.status,
      currentPage: book.currentPage || 0,
      timesRead: book.timesRead,
      rating: book.rating || 0
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      const updates: Partial<Book> = {
        ...bookDetails,
        updatedAt: new Date().toISOString(),
        genres: book.genres || [],
        rating: book.rating || 0
      };
      await bookService.updateBook(book.id, updates);
      onUpdate({ ...book, ...updates });
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating book:', error);
    }
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

  return (
    <>
      <Card sx={{ 
        display: 'flex', 
        mb: 2, 
        bgcolor: '#1a1a1a',
        color: 'white',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }
      }}>
        <CardMedia
          component="img"
          sx={{ width: 100, height: 150, objectFit: 'cover' }}
          image={book.coverUrl}
          alt={book.title}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <CardContent sx={{ flex: '1 0 auto', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {book.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  by {book.author}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  {(book.genres || []).map((genre, index) => (
                    <Chip
                      key={index}
                      label={genre}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(11, 206, 175, 0.1)',
                        color: '#0bceaf',
                        '&:hover': {
                          bgcolor: 'rgba(11, 206, 175, 0.2)',
                        },
                      }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Published: {book.publishedDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pages: {book.pageCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip
                    label={book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(book.status)}20`,
                      color: getStatusColor(book.status),
                      fontWeight: 'medium',
                    }}
                  />
                  {book.status === 'reading' && (
                    <Typography variant="body2" color="text.secondary">
                      Page {book.currentPage || 0} of {book.pageCount}
                    </Typography>
                  )}
                  {(book.rating || 0) > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Rating value={book.rating || 0} readOnly size="small" />
                      <Typography variant="body2" color="text.secondary">
                        ({(book.rating || 0).toFixed(1)})
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={handleOpenDialog}
                  sx={{ 
                    color: '#0bceaf',
                    '&:hover': {
                      bgcolor: 'rgba(11, 206, 175, 0.1)',
                    },
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  onClick={() => onDelete(book.id)}
                  sx={{ 
                    color: '#e74c3c',
                    '&:hover': {
                      bgcolor: 'rgba(231, 76, 60, 0.1)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Box>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Book</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
            <CardMedia
              component="img"
              sx={{ width: 100, height: 150, objectFit: 'cover', borderRadius: 1 }}
              image={book.coverUrl}
              alt={book.title}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                {book.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                by {book.author}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Published: {book.publishedDate}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pages: {book.pageCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(book.genres || []).map((genre, index) => (
                  <Chip
                    key={index}
                    label={genre}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(11, 206, 175, 0.1)',
                      color: '#0bceaf',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

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
                helperText={`Total pages: ${book.pageCount}`}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography component="legend">Rating</Typography>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ bgcolor: '#0bceaf', '&:hover': { bgcolor: '#099c85' } }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookCard; 