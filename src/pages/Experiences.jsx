import React, { useState } from 'react';

const Experiences = () => {
  const [experiences, setExperiences] = useState([
    {
      id: 1,
      author: 'Sarah M.',
      date: '2024-12-15',
      title: 'Finding My Creative Layer',
      content: 'I never considered myself artistic until I joined the community art workshop. Working alongside others, I discovered that creativity isn\'t about perfection—it\'s about connection. My layer of hesitation transformed into a layer of bold expression.',
      likes: 12,
      tags: ['creativity', 'art', 'personal-growth']
    },
    {
      id: 2,
      author: 'Marcus T.',
      date: '2024-12-10',
      title: 'The Power of Parallel Stories',
      content: 'At the storytelling circle, I shared my journey of starting over in a new city. What amazed me was how many parallel experiences others had. We were all building new layers in different ways, but the emotions and challenges were so similar. I left feeling less alone.',
      likes: 18,
      tags: ['storytelling', 'community', 'connection']
    },
    {
      id: 3,
      author: 'Elena R.',
      date: '2024-12-05',
      title: 'Layers of Collaboration',
      content: 'Our project showcase wasn\'t just about displaying work—it was about seeing how individual layers combined into something none of us could have created alone. The synergy was incredible, and it proved that parallel doesn\'t mean separate.',
      likes: 25,
      tags: ['collaboration', 'projects', 'community']
    }
  ]);

  const [newExperience, setNewExperience] = useState({
    author: '',
    title: '',
    content: '',
    tags: ''
  });

  const [showForm, setShowForm] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const handleSubmit = (e) => {
    e.preventDefault();
    const experience = {
      ...newExperience,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      tags: newExperience.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    setExperiences([experience, ...experiences]);
    setNewExperience({ author: '', title: '', content: '', tags: '' });
    setShowForm(false);
  };

  const handleLike = (experienceId) => {
    if (likedPosts.has(experienceId)) {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(experienceId);
        return newSet;
      });
      setExperiences(prev => prev.map(exp => 
        exp.id === experienceId 
          ? { ...exp, likes: Math.max(0, exp.likes - 1) }
          : exp
      ));
    } else {
      setLikedPosts(prev => new Set([...prev, experienceId]));
      setExperiences(prev => prev.map(exp => 
        exp.id === experienceId 
          ? { ...exp, likes: exp.likes + 1 }
          : exp
      ));
    }
  };

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h1>Experiences</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="share-experience-btn"
        >
          Share Your Experience
        </button>
      </div>

      <div className="card">
        <p>
          This is where our community shares their layers of experience. Every story adds depth to our collective narrative, showing how individual journeys run in parallel, creating connections and inspiring growth.
        </p>
        <p>
          <strong>Share your layer:</strong> How has Apollo Selene impacted your life? What connections have you made? What have you discovered about yourself or others?
        </p>
      </div>

      {/* Share Experience Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal experience-modal">
            <h3>Share Your Experience</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Your Name (or initials)"
                value={newExperience.author}
                onChange={(e) => setNewExperience({...newExperience, author: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Experience Title"
                value={newExperience.title}
                onChange={(e) => setNewExperience({...newExperience, title: e.target.value})}
                required
              />
              <textarea
                placeholder="Share your experience... How has Apollo Selene impacted you? What connections have you made? What layers have you discovered?"
                value={newExperience.content}
                onChange={(e) => setNewExperience({...newExperience, content: e.target.value})}
                rows="6"
                required
              />
              <input
                type="text"
                placeholder="Tags (comma-separated, e.g., creativity, connection, growth)"
                value={newExperience.tags}
                onChange={(e) => setNewExperience({...newExperience, tags: e.target.value})}
              />
              <div className="modal-actions">
                <button type="submit">Share Experience</button>
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experiences Feed */}
      <div className="experiences-feed">
        {experiences.map(experience => (
          <div key={experience.id} className="experience-card">
            <div className="experience-header">
              <div className="author-info">
                <div className="author-avatar">
                  {experience.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4>{experience.author}</h4>
                  <span className="experience-date">
                    {new Date(experience.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="experience-content">
              <h3>{experience.title}</h3>
              <p>{experience.content}</p>
            </div>
            
            <div className="experience-tags">
              {experience.tags.map(tag => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
            
            <div className="experience-actions">
              <button 
                className={`like-btn ${likedPosts.has(experience.id) ? 'liked' : ''}`}
                onClick={() => handleLike(experience.id)}
              >
                <span className="heart">♥</span>
                {experience.likes}
              </button>
              <span className="layer-indicator">+ Layer Added</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card text-center">
        <h3>Every Experience Matters</h3>
        <p>
          Your story becomes part of our collective layer. Whether it's a moment of connection, 
          a creative breakthrough, or a simple realization—every experience adds to the parallel 
          narrative we're building together.
        </p>
      </div>
    </div>
  );
};

export default Experiences;