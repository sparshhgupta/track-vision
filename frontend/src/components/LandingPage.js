// src/components/LandingPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1>TrackVision</h1>
        <p className="tagline">The Smart Solution for Efficient Object Tracking Annotation</p>
        <p className="subtagline">Reduce manual review time with our workflow</p>
      </header>

      <section className="value-proposition">
        <div className="value-card">
          <h2>Stop Wasting Time Scanning Entire Videos</h2>
          <p>Our system automatically detects potential ID switch frames from your tracking CSV, taking you straight to the critical moments that need verification.</p>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Analysts Love TrackVision</h2>
        <div className="features-grid">
          <div className="feature-card highlight-card">
            <h3>⏱️ Smart Frame Navigation</h3>
            <p>Automatically jump to frames near potential ID switches - no more scrubbing through hours of footage.</p>
          </div>
          <div className="feature-card highlight-card">
            <h3>📊 Batch Processing</h3>
            <p>Log multiple entries and process them in batches to minimize waiting time between operations.</p>
          </div>
          {/* <div className="feature-card highlight-card">
            <h3>📝 Intelligent Log Table</h3>
            <p>Our persistent logging system remembers your work so you don't have to re-enter data for every session.</p>
          </div> */}
        </div>
      </section>

      <section className="how-it-works">
        <h2>How To Use the Tool</h2>
        <div className="workflow-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Upload & Auto-Analyze</h3>
              <p>Simply upload your video and tracking CSV. Our system extracts all track details and flags potential ID switches automatically.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Smart Navigation</h3>
              <p>The tool takes you directly to frames where ID switches likely occurred, bypassing irrelevant footage.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Batch Correction</h3>
              <p>Make all your annotations in our log table, then apply them in a single batch operation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="testimonial">
        <blockquote>
          "TrackVision cut our video review time from 8 hours to just 90 minutes per project. The batch processing feature alone saves us 20+ hours each week."
        </blockquote>
        <p className="attribution">- Senior Video Analyst, Autonomous Vehicle Company</p>
      </section> */}

      <div className="cta-section">
        <button 
          onClick={() => navigate('/app')}
          className="start-button"
        >
          Start Saving Time Now
        </button>
        {/* <p className="demo-text">No installation required. Works directly in your browser.</p> */}
        <p className="secondary-cta">Try with our sample data to see the magic</p>
      </div>

      {/* <footer className="landing-footer">
        <div className="footer-content">
          <p>Trusted by video analysts at leading research institutions and tech companies</p>
          <p>Questions? <a href="mailto:support@trackvision.com">support@trackvision.com</a></p>
        </div>
      </footer> */}
    </div>
  );
}

export default LandingPage;