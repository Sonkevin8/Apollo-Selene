import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import MapExchange from './pages/MapExchange';

const App = () => {
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