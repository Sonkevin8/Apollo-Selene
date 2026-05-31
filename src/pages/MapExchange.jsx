import React, { useState } from 'react';
import LocationCapture from '../components/LocationCapture';
import MapPhaser from '../components/MapPhaser';
import MixtapeUpload from '../components/MixtapeUpload';

const MapExchange = () => {
  const [userLocation, setUserLocation] = useState(null);

  const [mixtapePegs, setMixtapePegs] = useState([]);

  if (!userLocation) {
    return (
      <div className="content-section">
        <LocationCapture onLocationCaptured={setUserLocation} />
      </div>
    );
  }

  const handleUpload = ({ title, file }) => {
    // For now, just add a peg for the user's location and mixtape title
    setMixtapePegs((prev) => [
      ...prev,
      { lat: userLocation.lat, lng: userLocation.lng, title }
    ]);
  };

  return (
    <div className="content-section">
      <h1>Map Exchange (Retro Game Style)</h1>
      <p>Your location is set! (Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)})</p>
      <MixtapeUpload onUpload={handleUpload} />
      <MapPhaser userLocation={userLocation} mixtapePegs={mixtapePegs} />
      {/* Map interaction and ordering logic will go here */}
    </div>
  );
};

export default MapExchange;
