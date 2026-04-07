import React, { useState } from 'react';

const Merchandise = () => {
  const [items] = useState([
    {
      id: 1,
      name: 'Apollo Selene T-Shirt',
      price: '$',
      description: 'Soft cotton tee featuring our signature layered design. Wear your connection to the movement.',
      image: 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=400',
      category: 'apparel'
    },
    {
      id: 2,
      name: 'Community Hoodie',
      price: '$',
      description: 'Cozy hoodie perfect for community gatherings. Features embroidered "Layers" text.',
      image: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400',
      category: 'apparel'
    },
    {
      id: 5,
      name: 'Connection Poster',
      price: '$',
      description: 'Set of 3 artistic posters celebrating community, creativity, and authentic connection.',
      image: 'https://images.pexels.com/photos/1109541/pexels-photo-1109541.jpeg?auto=compress&cs=tinysrgb&w=400',
      category: 'art'
    },
   
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);

  const categories = ['all', 'apparel', 'accessories', 'stationery', 'art'];

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    setCart([...cart, item]);
    // In a real app, this would integrate with a shopping cart system
    alert(`${item.name} added to cart!`);
  };

  return (
    <div className="content-section">
      <h1>Merchandise</h1>
      
      <div className="card">
        <p>
          Support the Apollo Selene movement with merchandise that represents our values of connection, 
          creativity, and authentic community. Every purchase helps fund community events and projects.
        </p>
        <p>
          <strong>More than merchandise:</strong> These items are conversation starters, connection points, 
          and ways to carry the movement's energy into your daily life.
        </p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <h3>Shop by Category</h3>
        <div className="filter-buttons">
          {categories.map(category => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Merchandise Grid */}
      <div className="merchandise-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="merchandise-card">
            <div className="item-image">
              <img src={item.image} alt={item.name} />
              <div className="item-overlay">
                <button 
                  className="quick-add-btn"
                  onClick={() => addToCart(item)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
            <div className="item-info">
              <h4>{item.name}</h4>
              <p className="item-description">{item.description}</p>
              <div className="item-footer">
                <span className="item-price">{item.price}</span>
                <span className="item-category">#{item.category}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Supporting the Movement</h3>
        <p>
          Every purchase directly supports:
        </p>
        <ul>
          <li><strong>Community Events:</strong> Workshops, storytelling circles, and showcases</li>
          <li><strong>Creative Projects:</strong> Collaborative art and community initiatives</li>
          <li><strong>Space & Resources:</strong> Venues and materials for gatherings</li>
          <li><strong>Outreach:</strong> Growing the movement and reaching new communities</li>
        </ul>
        <p>
          When you wear or use Apollo Selene merchandise, you're not just representing a brand—
          you're carrying forward a living culture of connection and creativity.
        </p>
      </div>

      {cart.length > 0 && (
        <div className="cart-summary">
          <h4>Cart Summary ({cart.length} items)</h4>
          <p>Items will be processed through our secure checkout system.</p>
        </div>
      )}
    </div>
  );
};

export default Merchandise;