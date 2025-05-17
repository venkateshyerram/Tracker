import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { theme } from './theme/theme';
import Navbar from './components/common/Navbar';
import Home from './components/Home/Home';
import Tracker from './components/Tracker/Tracker';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SearchProvider, useSearch } from './contexts/SearchContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import SearchModal from './components/shared/SearchModal';

// Create a client
const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading, error } = useAuth();
  const { openSearchModal, isSearchModalOpen, closeSearchModal } = useSearch();
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#1a1a1a'
      }}>
        <CircularProgress sx={{ color: '#0bceaf' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">
          {error instanceof Error ? error.message : 'An error occurred'}
        </Typography>
      </Box>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              transition: 'opacity 0.3s ease-in-out',
              opacity: scrollPosition > 100 ? 0.8 : 1,
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <Navbar onSearchClick={openSearchModal} />
          </Box>
        )}
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
          <Route path="/tracker" element={user ? <Tracker /> : <Navigate to="/login" />} />
        </Routes>
        <SearchModal
          open={isSearchModalOpen}
          onClose={closeSearchModal}
          onBookSelect={(book) => {
            // Handle book selection based on current route
            const currentPath = window.location.pathname;
            console.log('Book selected in path:', currentPath);
            
            // Dispatch the event to the document
            const event = new CustomEvent('bookSelected', { 
              detail: book,
              bubbles: true,
              composed: true
            });
            document.dispatchEvent(event);
            console.log('Book selection event dispatched');
          }}
        />
      </div>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SearchProvider>
            <AppContent />
          </SearchProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
