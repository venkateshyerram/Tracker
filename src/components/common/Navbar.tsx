import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import SearchIcon from '@mui/icons-material/Search';
import { useSearch } from '../../contexts/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  onSearchClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
  const { openSearchModal } = useSearch();
  const [username, setUsername] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUsername = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      }
    };

    fetchUsername();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AppBar position="fixed" sx={{ bgcolor: '#1a1a1a', boxShadow: 'none' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Tracker
          </Typography>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                color="inherit"
                onClick={onSearchClick}
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <SearchIcon />
              </IconButton>
              <Button
                component={RouterLink}
                to="/"
                color="inherit"
                sx={{
                  fontWeight: location.pathname === '/' ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Home
              </Button>
              <Button
                component={RouterLink}
                to="/tracker"
                color="inherit"
                sx={{
                  fontWeight: location.pathname === '/tracker' ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Book Tracker
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 