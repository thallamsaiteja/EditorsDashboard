import React from 'react';
import { Link } from 'react-router-dom';
import './homepage.css'; // This links our new CSS file

// Header Component
const Header = () => (
  <header className="header">
    <nav className="header__nav">
      <Link to="/" className="header__logo">
        EditorsDashboard
      </Link>
      <div className="header__actions">
        <Link to="/login" className="btn btn--primary">
          Login
        </Link>
      </div>
    </nav>
  </header>
);

// Hero Section Component
const HeroSection = () => (
  <section className="hero">
    <div className="hero__gradient-bg"></div>
    <div className="hero__content">
      <h1 className="hero__title">
        The Future of Content Creation
      </h1>
      <p className="hero__subtitle">
        Your central hub for uploading, managing, and distributing video content with unparalleled speed and simplicity.
      </p>
      <div className="hero__actions">
        <Link to="/register" className="btn btn--secondary">
          Get Started for Free
        </Link>
      </div>
    </div>
  </section>
);

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
    <div className="feature-card">
        <div className="feature-card__icon">{icon}</div>
        <h3 className="feature-card__title">{title}</h3>
        <p className="feature-card__description">{description}</p>
    </div>
);

// Main Homepage Component
export default function Homepage() {
  return (
    <div className="homepage">
      <Header />
      <main>
        <HeroSection />
        
        <section className="features-section">
          <div className="container">
            <div className="features-section__header">
              <h2 className="features-section__title">Powerful Tools, Simplified</h2>
              <p className="features-section__subtitle">Everything you need to streamline your workflow and focus on creating amazing content.</p>
            </div>

            <div className="features-grid">
              <FeatureCard 
                icon="📤"
                title="Effortless Uploads"
                description="Robust backend processing ensures your files are handled quickly and securely."
              />
              <FeatureCard 
                icon="🗂️"
                title="Content Management"
                description="Organize projects, tag videos, and manage your entire library from one intuitive dashboard."
              />
              <FeatureCard 
                icon="🔗"
                title="Easy Sharing"
                description="Generate secure, shareable links in an instant to distribute your content effortlessly."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} EditorsDashboard. All rights reserved.</p>
      </footer>
    </div>
  );
}