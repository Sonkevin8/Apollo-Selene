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
      <button type="button" className="location-capture-btn" onClick={handleGetLocation}>Get my location</button>
      {status && <p className="location-capture-status">{status}</p>}
    </div>
  );
};

export default LocationCapture;
