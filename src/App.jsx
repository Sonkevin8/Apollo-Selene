import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { getCurrentSession, onAuthStateChange } from './lib/mixtapeExchange';
import Home from './pages/Home';
import Events from './pages/Events';
import Experiences from './pages/Experiences';
import Merchandise from './pages/Merchandise';
import Artwork from './pages/Artwork';
import EmberRoom from './pages/EmberRoom';
import MixtapeExchange from './pages/MixtapeExchange';
import Account from './pages/Account';
import ThankYou from './pages/ThankYou';
import PastEvents from './pages/PastEvents';
import { getSiteContent } from './lib/siteContent';
import ApolloDayVibe from './components/ApolloDayVibe';
import SeleneNightVibe from './components/SeleneNightVibe';
import SunMoonOrbit from './components/SunMoonOrbit';
import RaverSprites from './components/RaverSprites';

const THEME_STORAGE_KEY = 'apollo-selene-theme';
import Earth from './pages/Earth';

const App = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'apollo';
    }

    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      return saved;
    }

    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'apollo' : 'selene';
  });

  const [session, setSession] = useState(null);
  const [siteContent, setSiteContent] = useState({});

  useEffect(() => {
    getCurrentSession().then(setSession).catch(() => {});
    const { data: authSub } = onAuthStateChange((_, nextSession) => setSession(nextSession));
    return () => authSub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getSiteContent();
      if (data) setSiteContent(data);
    };
    loadContent();
  }, []);

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
      {theme === 'apollo' ? <ApolloDayVibe /> : <SeleneNightVibe />}
      <SunMoonOrbit theme={theme} />
      <RaverSprites theme={theme} />
      <Router>
        <div className="layout-container">
          <aside className="Navbar">
            <Navbar theme={theme} onToggleTheme={toggleTheme} session={session} />
          </aside>
          <main className="content-container">
            <Suspense fallback={<div className="card">Loading Earth Explorer...</div>}>
              <Routes>
                <Route path="/" element={<Home theme={theme} siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/events" element={<Events theme={theme} siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/past-events" element={<PastEvents siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/experiences" element={<Experiences siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/account" element={<Account siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/merchandise" element={<Merchandise siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/artwork" element={<Artwork siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/mixtape-exchange" element={<MixtapeExchange globeComponent={<Earth />} />} />
                <Route path="/ember-room" element={<EmberRoom siteContent={siteContent} onSiteContentUpdated={setSiteContent} />} />
                <Route path="/thank-you" element={<ThankYou />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;