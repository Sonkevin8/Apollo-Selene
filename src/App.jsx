import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Events from './pages/Events';
import Experiences from './pages/Experiences';
import Merchandise from './pages/Merchandise';
import Artwork from './pages/Artwork';
import EmberRoom from './pages/EmberRoom';

const THEME_STORAGE_KEY = 'apollo-selene-theme';

const App = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'apollo';
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'apollo';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme === 'apollo' ? 'light' : 'dark';
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'apollo' ? 'selene' : 'apollo'));
  };

  return (
    <div className="app-shell">
      <Router>
        <div className="layout-container">
          <aside className="Navbar">
            <Navbar theme={theme} onToggleTheme={toggleTheme} />
          </aside>
          <main className="content-container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/merchandise" element={<Merchandise />} />
              <Route path="/artwork" element={<Artwork />} />
              <Route path="/ember-room" element={<EmberRoom />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;