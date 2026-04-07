import React, { useState } from 'react';

const Merchandise = () => {
  const [items] = useState([
    {
      id: 1,
      name: 'Apollo Selene Tee',
      price: '$',
      description: 'Soft cotton tee with a clean Apollo Selene mark, designed for everyday comfort and quiet community pride.',
      image: 'https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg?auto=compress&cs=tinysrgb&w=400',
      category: 'apparel'
    },
    {
      id: 2,
      name: 'Moonlight Hoodie',
      price: '$',
      description: 'A cozy layer for evening events and relaxed nights, finished with understated Apollo Selene embroidery.',
      image: 'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400',
      category: 'apparel'
    },
    {
      id: 5,
      name: 'Sun and Moon Print Set',
      price: '$',
      description: 'A set of art prints inspired by rest, gathering, and the balance at the heart of Apollo Selene.',
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
          Apollo Selene merchandise is meant to feel as relaxed and thoughtful as the space itself. These pieces carry the atmosphere of the community into daily life while helping support future gatherings.
        </p>
        <p>
          <strong>More than merchandise:</strong> They are small reminders of a place where people can show up, settle in, and feel comfortable being themselves.
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
        <h3>Supporting Apollo Selene</h3>
        <p>
          Every purchase directly supports:
        </p>
        <ul>
          <li><strong>Welcoming Events:</strong> Gatherings designed to feel calm, accessible, and easy to join</li>
          <li><strong>Creative Programming:</strong> Story circles, art sessions, and reflective community moments</li>
          <li><strong>Comfortable Spaces:</strong> Seating, supplies, and atmosphere-focused details that help people relax</li>
          <li><strong>Community Reach:</strong> Inviting more people into a space that feels warm from the start</li>
        </ul>
        <p>
          When you wear or use Apollo Selene merchandise, you're not just representing a brand—
          you're helping sustain a welcoming place people can return to whenever a new event is announced.
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