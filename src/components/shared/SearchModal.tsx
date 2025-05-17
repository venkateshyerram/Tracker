import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import { useQuery } from 'react-query';
import { bookSearchService } from '../../services/bookSearchService';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { BookSearchResult } from '../../types/book';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onBookSelect: (book: BookSearchResult) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ open, onClose, onBookSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults = [], isLoading: searchLoading } = useQuery(
    ['searchBooks', searchQuery],
    async () => {
      if (!searchQuery) return [];
      return await bookSearchService.searchBooks(searchQuery);
    },
    {
      enabled: !!searchQuery,
    }
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const handleBookSelect = (book: BookSearchResult) => {
    onBookSelect(book);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        p: 2,
        zIndex: 1200
      }}
    >
      <Box sx={{
        width: '100%',
        maxWidth: '1200px',
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        mt: 4,
        maxHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for books..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mr: 2 }}
          />
          <IconButton onClick={handleClose} size="large">
            <CloseIcon />
          </IconButton>
        </Box>
        
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
        }}>
          {searchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : searchResults.length > 0 ? (
            <List>
              {searchResults.map((book) => (
                <React.Fragment key={book.id}>
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
                        src={book.coverUrl}
                        alt={book.title}
                        sx={{ width: 60, height: 90 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={book.title}
                      secondary={
                        <>
                          {book.authors?.join(', ') || 'Unknown Author'}
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Source: {book.source}
                          </Typography>
                        </>
                      }
                      primaryTypographyProps={{
                        sx: { fontWeight: 'medium' }
                      }}
                    />
                    <Tooltip title="Add to List">
                      <IconButton
                        onClick={() => handleBookSelect(book)}
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
              No books found. Try a different search term.
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Modal>
  );
};

export default SearchModal; 