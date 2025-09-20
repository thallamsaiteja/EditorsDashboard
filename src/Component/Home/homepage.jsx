import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './homepage.css';
import logo from '../../assets/logo.png';

// --- Reusable Hook for Scroll Animations ---
const useScrollAnimation = () => {
    const elementRef = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            }, { threshold: 0.1 }
        );
        if (elementRef.current) observer.observe(elementRef.current);
        return () => {
            if (elementRef.current) observer.unobserve(elementRef.current);
        };
    }, []);
    return elementRef;
};

// --- Page Components ---

const Header = () => (
  <header className="header">
    <nav className="header__nav">
      <Link to="/" className="header__logo">
        <img src={logo} alt="Kaizer News Logo" className="header__logo-img" />
      </Link>
      <div className="header__actions">
        <Link to="/login" className="btn btn--primary">
          Login / Register
        </Link>
      </div>
    </nav>
  </header>
);

const HeroSection = () => {
    const heroRef = useRef(null);
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!heroRef.current) return;
            const rect = heroRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const gradientBg = heroRef.current.querySelector('.hero__gradient-bg');
            if (gradientBg) {
                gradientBg.style.transform = `translate(-50%, -50%) translate(${x / 20}px, ${y / 20}px)`;
            }
        };
        const currentRef = heroRef.current;
        currentRef.addEventListener('mousemove', handleMouseMove);
        return () => currentRef.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section ref={heroRef} className="hero">
            <div className="hero__gradient-bg"></div>
            <div className="hero__content">
                <h1 className="hero__title">
                    Be the Voice of Your Community.
                </h1>
                <p className="hero__subtitle">
                    At Kaizer News, we believe that every citizen has the power to share stories that matter. Your voice deserves a platform.
                </p>
                <div className="hero__actions">
                    <a href="#register" className="btn btn--secondary">
                        Become a Reporter
                    </a>
                </div>
            </div>
        </section>
    );
};

// NEW: YouTube Community Section
const YouTubeSection = () => {
    const sectionRef = useScrollAnimation();
    return (
        <section ref={sectionRef} className="youtube-section fade-in-section">
            <div className="container youtube-section__container">
                <div className="youtube-section__text">
                    <h2 className="section-title">Real News, Reported by Real People</h2>
                    <p className="section-subtitle">
                        With over <strong>2.74 Million subscribers</strong>, our YouTube channel is the heart of our community. We are a network powered by the people, for the people of Hyderabad.
                    </p>
                </div>
                <div className="youtube-section__action">
                     <a href="https://www.youtube.com/@KaizerNewsTelugu" target="_blank" rel="noopener noreferrer" className="btn-youtube">
                        <svg className="btn-youtube__icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"></path></svg>
                        <span>Visit Our Channel</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

const ProgramSection = () => {
    const sectionRef = useScrollAnimation();
    return (
        <section ref={sectionRef} className="program-section fade-in-section">
            <div className="container program-section__container">
                <div className="program-section__text">
                    <h2 className="section-title">What is the Program?</h2>
                    <p className="section-subtitle">
                        A voluntary, community-driven initiative where citizens can register as <strong>Kaizer Community Reporters</strong> to share local updates directly with our editorial team.
                    </p>
                    <p className="program-section__note">
                        <strong>Important Note:</strong> This is a voluntary and unpaid program.
                    </p>
                </div>
                <div className="program-section__visual">
                    <div className="id-card">
                        <div className="id-card__header"><img src={logo} alt="Kaizer News" /></div>
                        <div className="id-card__photo"></div>
                        <div className="id-card__name">YOUR NAME</div>
                        <div className="id-card__title">COMMUNITY REPORTER</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const WhoCanJoinSection = () => {
    const sectionRef = useScrollAnimation();
    return (
        <section ref={sectionRef} className="who-can-join-section fade-in-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">Who Can Join?</h2>
                    <p className="section-subtitle">Anyone with a passion for storytelling & community issues. No journalism background required.</p>
                </div>
                <div className="join-grid">
                    <div className="join-card"><div className="join-card__icon">🎓</div><h3 className="join-card__title">Students</h3></div>
                    <div className="join-card"><div className="join-card__icon">💼</div><h3 className="join-card__title">Professionals</h3></div>
                    <div className="join-card"><div className="join-card__icon">🏠</div><h3 className="join-card__title">Homemakers</h3></div>
                    <div className="join-card"><div className="join-card__icon">✊</div><h3 className="join-card__title">Activists</h3></div>
                </div>
            </div>
        </section>
    );
};

const HowItWorksSection = () => {
    const sectionRef = useScrollAnimation();
    return (
        <section ref={sectionRef} className="workflow-section fade-in-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">How It Works</h2>
                </div>
                <div className="workflow-steps">
                    <div className="workflow-step"><div className="workflow-step__number">1</div><h3 className="workflow-step__title">Register Online</h3><p className="workflow-step__description">Fill out the form with your details and photo to receive your digital ID instantly.</p></div>
                    <div className="workflow-connector"></div>
                    <div className="workflow-step"><div className="workflow-step__number">2</div><h3 className="workflow-step__title">Start Reporting</h3><p className="workflow-step__description">Share local news, photos, and videos via WhatsApp, email, or our dedicated app.</p></div>
                    <div className="workflow-connector"></div>
                    <div className="workflow-step"><div className="workflow-step__number">3</div><h3 className="workflow-step__title">Get Featured</h3><p className="workflow-step__description">Verified stories will be published on our platforms with your name credited for recognition.</p></div>
                </div>
            </div>
        </section>
    );
};

const WhatYouGetSection = () => {
    const sectionRef = useScrollAnimation();
    return(
        <section ref={sectionRef} className="what-you-get-section fade-in-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">What You Get</h2>
                </div>
                <ul className="benefits-list">
                    <li className="benefit-item">Official recognition as a Kaizer Community Reporter</li>
                    <li className="benefit-item">Your stories credited on Kaizer News platforms</li>
                    <li className="benefit-item">An opportunity to highlight important community issues</li>
                    <li className="benefit-item">A pathway to future opportunities in journalism</li>
                </ul>
            </div>
        </section>
    );
};

const CallToActionSection = () => {
    const sectionRef = useScrollAnimation();
    return(
        <section ref={sectionRef} id="register" className="cta-section fade-in-section">
            <div className="container cta-section__container">
                <h2 className="cta-section__title">Ready to Join?</h2>
                <p className="cta-section__subtitle">Be the change. Be the reporter.</p>
                <Link to="/register" className="btn btn--secondary btn--large">
                    Register Now
                </Link>
            </div>
        </section>
    );
};

export default function Homepage() {
  return (
    <div className="homepage">
      <Header />
      <main>
        <HeroSection />
        <YouTubeSection />
        <ProgramSection />
        <WhoCanJoinSection />
        <HowItWorksSection />
        <WhatYouGetSection />
        <CallToActionSection />
      </main>
      <footer className="footer">
        <p className="footer__promise">All content is carefully verified before publishing. Misuse of Kaizer IDs for personal gain, false reporting, or misconduct will lead to termination.</p>
        <p>&copy; {new Date().getFullYear()} Kaizer News – Powered by the People.</p>
      </footer>
    </div>
  );
}