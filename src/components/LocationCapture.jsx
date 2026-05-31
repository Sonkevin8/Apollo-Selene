import React, { useState } from 'react';

const LocationCapture = ({ onLocationCaptured }) => {
  const [status, setStatus] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);

  const handleGetLocation = () => {
    setStatus('Requesting location...');
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus('Location captured!');
        onLocationCaptured({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: '', // Address lookup can be added later
        });
      },
      (error) => {
        setStatus('Location access denied or unavailable.');
      }
    );
  };

  return (
    <div className="location-capture">
      <h2>Set Your Location</h2>
      <p>To participate, please allow location access. This will place your mixtape on the map.</p>
      <button onClick={handleGetLocation}>Get My Location</button>
      {status && <p>{status}</p>}
      {coords && (
        <p>
          Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default LocationCapture;
