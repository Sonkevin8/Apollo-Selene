import React from 'react';

const Merchandise = () => {
  return (
    <div className="content-section">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="section-kicker">Merchandise</p>
          <h1>Coming Soon</h1>
          <p className="hero-lead">
            The Apollo Selene shop is being prepared now and is not open yet.
          </p>
          <p>
            When it launches, it will include a small collection of thoughtful pieces that match the tone of the space: calm, useful, and easy to bring into everyday life.
          </p>
        </div>

        <div className="mission-panel">
          <p className="mission-label">What To Expect</p>
          <p className="mission-text">
            Apparel, art prints, and a few quiet keepsakes that help support future gatherings without turning the site into a storefront too early.
          </p>
        </div>
      </section>

      <section className="card">
        <h2>Why It Is Locked For Now</h2>
        <p>
          The merchandise section is paused until the first collection, pricing, and fulfillment details are ready. That keeps the site focused on events and community updates until the shop experience is complete.
        </p>
        <p>
          Check back soon for the official launch.
        </p>
      </section>
    </div>
  );
};

export default Merchandise;