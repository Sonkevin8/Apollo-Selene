import React from 'react';

export default function Home() {
  return (
    <div className="content-section">
      <h1>Welcome to Apollo Selene</h1>
      
      <div className="card">
        <p>
          Apollo Selene is a movement and community built on the belief that purposeful, joyful action attracts like-minded people, creating growth, unity, and deeper human connection.
        </p>
        <p>
          It's about living the vision, not just talking about it—proving its value through real-world experiences, events, and relationships.
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>What Are Layers?</h3>
          <p>
            Every action, project, and interaction becomes a "layer" in the bigger picture. These layers run in parallel between people—our stories, passions, and moments existing side by side, influencing and inspiring each other.
          </p>
        </div>

        <div className="card">
          <h3>Our Vision</h3>
          <p>
            A thriving, accepting community where people work shoulder-to-shoulder, share their layers of life, and create a shared momentum that's impossible to ignore.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Core Principles</h2>
        <div className="grid grid-3">
          <div className="principle-card">
            <h4>Connection Through Shared Experience</h4>
            <p>Bringing people together physically and emotionally through meaningful interactions and events.</p>
          </div>
          <div className="principle-card">
            <h4>Creativity as a Bridge</h4>
            <p>Using art, storytelling, and collaboration as tools for unity and deeper understanding.</p>
          </div>
          <div className="principle-card">
            <h4>Momentum Through Authenticity</h4>
            <p>Consistency in living our values attracts genuine support and creates lasting impact.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Why Apollo Selene Stands Out</h2>
        <ul>
          <li><strong>Self-proving:</strong> Growth is shown in the community, art, and projects it sparks</li>
          <li><strong>Living culture:</strong> Not just an event or brand—it's a lived culture that expands through participation</li>
          <li><strong>Heart-led and action-driven:</strong> Blends emotional resonance with tangible outcomes</li>
        </ul>
      </div>

      <div className="text-center">
        <p style={{ fontSize: '1.2rem', fontStyle: 'italic', color: '#ed4956' }}>
          Join us in creating layers of connection, creativity, and authentic momentum.
        </p>
      </div>
    </div>
  );
}