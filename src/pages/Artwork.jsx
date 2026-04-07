import React, { useState } from 'react';

export default function Artwork() {
  const [artworks] = useState([
    {
      id: 1,
      title: 'Quiet Orbit',
      artist: 'Apollo Selene Collective',
      description: 'A collaborative work built around the feeling of arriving somewhere peaceful. Soft tones and circular movement reflect the calm rhythm of the space.',
      image: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Mixed Media',
      year: '2026',
      story: 'Created during an early Apollo Selene gathering, this piece invited each guest to add one mark representing what comfort looks like to them. The final composition became a shared map of rest, warmth, and belonging.'
    },
    {
      id: 2,
      title: 'Between Sun and Moon',
      artist: 'J. Rivera and N. Cole',
      description: 'This piece explores the balance between bright social energy and quiet reflection, the two moods Apollo Selene tries to hold at once.',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Digital Art',
      year: '2026',
      story: 'The artists developed this work after a reflection night focused on what people need from a community space. Their answer was balance: room for conversation, room for silence, and a feeling that both are welcome.'
    },
    {
      id: 3,
      title: 'Soft Landing',
      artist: 'Mina Sol',
      description: 'A warm abstract painting inspired by the moment someone realizes they can let their shoulders drop and simply be present.',
      image: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=600',
      medium: 'Acrylic on Canvas',
      year: '2025',
      story: 'Painted after an Apollo Selene open house, this piece captures the emotional shift from uncertainty to ease. It became one of the defining images for the community because it mirrors the feeling many visitors describe.'
    },
  ]);

  const [selectedArtwork, setSelectedArtwork] = useState(null);

  return (
    <div className="content-section">
      <h1>Apollo Selene Gallery</h1>
      
      <div className="card">
        <p>
          The gallery reflects the emotional tone of Apollo Selene: calm, welcoming, and quietly alive. These works help shape the atmosphere around our events and give people another way to connect with the space.
        </p>
        <p>
          <strong>Living Gallery:</strong> This collection grows through gatherings, conversations, and shared moments of reflection. Each piece carries a little of the mood people come here to find.
        </p>
      </div>

      {/* Artwork Gallery */}
      <div className="artwork-gallery">
        {artworks.map(artwork => (
          <div 
            key={artwork.id} 
            className="artwork-card"
            onClick={() => setSelectedArtwork(artwork)}
          >
            <div className="artwork-image">
              <img src={artwork.image} alt={artwork.title} />
              <div className="artwork-overlay">
                <span className="view-details">View Details</span>
              </div>
            </div>
            <div className="artwork-info">
              <h3>{artwork.title}</h3>
              <p className="artwork-artist">by {artwork.artist}</p>
              <p className="artwork-medium">{artwork.medium} • {artwork.year}</p>
              <p className="artwork-description">{artwork.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Artwork Detail Modal */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="modal artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn"
              onClick={() => setSelectedArtwork(null)}
            >
              ×
            </button>
            <div className="artwork-detail">
              <div className="artwork-detail-image">
                <img src={selectedArtwork.image} alt={selectedArtwork.title} />
              </div>
              <div className="artwork-detail-info">
                <h2>{selectedArtwork.title}</h2>
                <p className="detail-artist">by {selectedArtwork.artist}</p>
                <p className="detail-medium">{selectedArtwork.medium} • {selectedArtwork.year}</p>
                <p className="detail-description">{selectedArtwork.description}</p>
                <div className="artwork-story">
                  <h4>The Story Behind the Art</h4>
                  <p>{selectedArtwork.story}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Creativity Sets the Tone</h3>
        <p>
          In Apollo Selene, art helps create a softer entry into community. It gives people something to notice, reflect on, and talk about before the room ever asks anything from them.
        </p>
        <p>
          <strong>Want to contribute?</strong> Join an art night or share a piece that captures comfort, rest, gathering, or reflection. It does not need to be polished. It only needs to be honest.
        </p>
      </div>

      <div className="card">
        <h3>What the Gallery Holds</h3>
        <ul>
          <li><strong>Atmosphere Pieces:</strong> Work that helps the space feel warm, steady, and welcoming</li>
          <li><strong>Story-Carrying Art:</strong> Each piece reflects a real gathering, feeling, or conversation</li>
          <li><strong>Collaborative Spirit:</strong> Many works begin with more than one person contributing</li>
          <li><strong>Open Creativity:</strong> Anyone can contribute, regardless of experience or training</li>
          <li><strong>Growing Collection:</strong> The gallery evolves as the community continues to gather</li>
        </ul>
      </div>
    </div>
  );
}