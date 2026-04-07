import React, { useState } from 'react';

const Experiences = () => {
  const [experiences, setExperiences] = useState([
    {
      id: 1,
      author: 'Sarah M.',
      date: '2024-12-15',
      title: 'I Felt Comfortable Right Away',
      content: 'I came to Apollo Selene not knowing anyone and expected to feel awkward. Instead, the room felt soft, friendly, and easy to settle into. By the end of the night, I had sketched, laughed, and actually relaxed.',
      likes: 12,
      tags: ['welcome', 'art', 'calm']
    },
    {
      id: 2,
      author: 'Marcus T.',
      date: '2024-12-10',
      title: 'A Place To Exhale',
      content: 'The story circle gave me something I did not realize I needed: a place to slow down. No one pushed, no one performed. People listened, shared honestly, and made the whole night feel grounding.',
      likes: 18,
      tags: ['storytelling', 'comfort', 'community']
    },
    {
      id: 3,
      author: 'Elena R.',
      date: '2024-12-05',
      title: 'Gentle Energy, Real Connection',
      content: 'What stood out to me most was the balance. Apollo Selene feels alive without being overwhelming. I could talk to new people, take a break when I needed one, and still feel part of everything happening around me.',
      likes: 25,
      tags: ['connection', 'events', 'reflection']
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
        <h1>Reflections</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="share-experience-btn"
        >
          Share Your Reflection
        </button>
      </div>

      <div className="card">
        <p>
          This is where people share how Apollo Selene felt to them. Some reflections are about the events themselves, while others are about the comfort, quiet, and connection they found around them.
        </p>
        <p>
          <strong>Share your reflection:</strong> Did an event help you unwind? Did you feel welcome, inspired, or understood? Tell us what stayed with you.
        </p>
      </div>

      {/* Share Experience Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal experience-modal">
            <h3>Share Your Reflection</h3>
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
                placeholder="Share your reflection... How did Apollo Selene make you feel? What part of the event or atmosphere stayed with you?"
                value={newExperience.content}
                onChange={(e) => setNewExperience({...newExperience, content: e.target.value})}
                rows="6"
                required
              />
              <input
                type="text"
                placeholder="Tags (comma-separated, e.g., calm, connection, welcome)"
                value={newExperience.tags}
                onChange={(e) => setNewExperience({...newExperience, tags: e.target.value})}
              />
              <div className="modal-actions">
                <button type="submit">Share Reflection</button>
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
              <span className="layer-indicator">+ Reflection Added</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card text-center">
        <h3>Every Experience Matters</h3>
        <p>
          Every reflection helps define the kind of place Apollo Selene is becoming. Whether your story is about meeting someone new, finding a quiet corner, or finally feeling able to relax, it helps others know they can belong here too.
        </p>
      </div>
    </div>
  );
};

export default Experiences;