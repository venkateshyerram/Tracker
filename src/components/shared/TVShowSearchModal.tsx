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
  DialogTitle,
  DialogContent
} from '@mui/material';
import { useQuery } from 'react-query';
import { tvshowSearchService } from '../../services/tvshowSearchService';
import { TVShowSearchResult } from '../../types/tvshow';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

interface TVShowSearchModalProps {
  open: boolean;
  onClose: () => void;
  onTVShowSelect: (tvshow: TVShowSearchResult) => void;
}

const TVShowSearchModal: React.FC<TVShowSearchModalProps> = ({ open, onClose, onTVShowSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Add a small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const { data: tvshows, isLoading, error } = useQuery(
    ['tvshowSearch', searchQuery],
    () => tvshowSearchService.searchTVShows(searchQuery),
    {
      enabled: searchQuery.length > 0,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleTVShowSelect = (tvshow: TVShowSearchResult) => {
    onTVShowSelect(tvshow);
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
          placeholder="Search for TV shows..."
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
            <CircularProgress sx={{ color: '#0bceaf' }} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', p: 3 }}>
            Error searching for TV shows. Please try again.
          </Typography>
        ) : tvshows && tvshows.length > 0 ? (
          <List>
            {tvshows.map((tvshow) => (
              <React.Fragment key={tvshow.id}>
                <ListItem
                  sx={{
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      src={tvshow.posterUrl}
                      alt={tvshow.title}
                      sx={{ width: 60, height: 90 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={tvshow.title}
                    secondary={
                      <>
                        {tvshow.firstAirDate && `First aired: ${tvshow.firstAirDate}`}
                        {tvshow.lastAirDate && ` • Last aired: ${tvshow.lastAirDate}`}
                        <br />
                        {tvshow.numberOfSeasons && `${tvshow.numberOfSeasons} Seasons • ${tvshow.numberOfEpisodes} Episodes`}
                        <br />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {tvshow.description}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      sx: { 
                        fontWeight: 'medium',
                        color: 'white'
                      }
                    }}
                    secondaryTypographyProps={{
                      sx: { color: 'rgba(255,255,255,0.7)' }
                    }}
                  />
                  <Tooltip title="Add to List">
                    <IconButton
                      onClick={() => handleTVShowSelect(tvshow)}
                      sx={{ color: '#0bceaf' }}
                      size="large"
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              </React.Fragment>
            ))}
          </List>
        ) : searchQuery ? (
          <Typography variant="body1" sx={{ textAlign: 'center', p: 4, color: 'rgba(255,255,255,0.7)' }}>
            No TV shows found. Try a different search term.
          </Typography>
        ) : null}
      </Box>
    </Dialog>
  );
};

export default TVShowSearchModal; 