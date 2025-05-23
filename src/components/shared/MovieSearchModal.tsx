import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Modal,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Typography,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogContent
} from '@mui/material';
import { useQuery } from 'react-query';
import { movieSearchService, MovieSearchResult } from '../../services/movieSearchService';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

interface MovieSearchModalProps {
  open: boolean;
  onClose: () => void;
  onMovieSelect: (movie: MovieSearchResult) => void;
}

const MovieSearchModal: React.FC<MovieSearchModalProps> = ({ open, onClose, onMovieSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const inputElement = document.querySelector('.MuiInputBase-input') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  }, [open]);

  const { data: movies, isLoading, error } = useQuery(
    ['movieSearch', searchQuery],
    () => movieSearchService.searchMovies(searchQuery),
    {
      enabled: searchQuery.length > 0,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleMovieSelect = (movie: MovieSearchResult) => {
    onMovieSelect(movie);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: '100%',
          maxWidth: '1200px',
          bgcolor: 'transparent',
          borderRadius: 2,
          boxShadow: 24,
          mt: 0,
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 0
        },
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0, 0, 0, 0.8)'
        },
        zIndex: 1300
      }}
    >
      <DialogContent sx={{ 
        p: 2,
        bgcolor: 'transparent',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          variant="outlined"
          placeholder="Search for movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              color: 'white',
              bgcolor: 'transparent',
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
          inputProps={{
            ref: searchInputRef
          }}
        />
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={{ 
            color: 'white',
            '&:hover': {
              color: '#0bceaf'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogContent>
      
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        p: 2,
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
        bgcolor: 'transparent'
      }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', p: 3 }}>
            Error searching for movies. Please try again.
          </Typography>
        ) : movies && movies.length > 0 ? (
          <List>
            {movies.map((movie) => (
              <React.Fragment key={movie.id}>
                <ListItem
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      src={movie.posterUrl}
                      alt={movie.title}
                      sx={{ width: 60, height: 90 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={movie.title}
                    secondary={
                      <>
                        {movie.director}
                        <br />
                        {movie.releaseDate} • {movie.runtime} min
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {movie.description}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      sx: { fontWeight: 'medium' }
                    }}
                  />
                  <Tooltip title="Add to List">
                    <IconButton
                      onClick={() => handleMovieSelect(movie)}
                      color="primary"
                      size="large"
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : searchQuery ? (
          <Typography variant="body1" sx={{ textAlign: 'center', p: 4 }}>
            No movies found. Try a different search term.
          </Typography>
        ) : null}
      </Box>
    </Dialog>
  );
};

export default MovieSearchModal; 