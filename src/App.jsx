import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import MapExchange from './pages/MapExchange';

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
            <Navbar />
          </aside>
          <main className="content-container">
            <Routes>
              <Route path="/map-exchange" element={<MapExchange />} />
              <Route path="*" element={<MapExchange />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;