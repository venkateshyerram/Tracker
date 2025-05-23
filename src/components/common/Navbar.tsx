import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  onSearchClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuth();
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
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            noWrap
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #0bceaf, #4dabf7 50%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              letterSpacing: 1.5,
              fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
              userSelect: 'none',
              textDecoration: 'none',
              flexGrow: 1,
              lineHeight: 1.2
            }}
          >
            Tracker
          </Typography>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                Books
              </Button>
              <Button
                component={RouterLink}
                to="/movie-tracker"
                color="inherit"
                sx={{
                  fontWeight: location.pathname === '/movie-tracker' ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Movies
              </Button>
              <Button
                component={RouterLink}
                to="/tvshow-tracker"
                color="inherit"
                sx={{
                  fontWeight: location.pathname === '/tvshow-tracker' ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                TV Shows
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