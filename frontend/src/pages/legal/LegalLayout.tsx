import { Link } from "react-router-dom";
import "../../pages/Landing/LandingPage.css";

function Wordmark() {
  return (
    <span className="wordmark">
      <img src="/brand/saahvik-mark.png" alt="" className="wordmark-badge" width={40} height={40} />
      <span className="wordmark-text">Saahvik</span>
    </span>
  );
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="landing">
      {/* Nav — always in scrolled state */}
      <header className="landing-nav is-scrolled" style={{ position: "sticky" }}>
        <div className="landing-container landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="Saahvik home">
            <Wordmark />
          </Link>
          <nav className="landing-nav-actions" aria-label="Primary">
            <Link to="/#features" className="landing-nav-link landing-nav-link-secondary">Features</Link>
            <Link to="/#pricing" className="landing-nav-link landing-nav-link-secondary">Pricing</Link>
            <Link to="/login" className="landing-nav-link">Log in</Link>
            <Link to="/signup" className="btn btn-nav">Get Started</Link>
          </nav>
        </div>
      </header>

      <main className="legal-main">
        <div className="landing-container legal-container">
          <div className="legal-header">
            <h1 className="legal-title">{title}</h1>
            <p className="legal-updated">Last updated: {lastUpdated}</p>
          </div>
          <div className="legal-body">
            {children}
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <Wordmark />
            <span className="landing-footer-tagline">Smarter Hostel Management</span>
          </div>
          <div className="landing-footer-meta">
            <a href="https://wa.me/919530301131" target="_blank" rel="noreferrer">+91 9530301131</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>
            <span aria-hidden="true">·</span>
            <Link to="/privacy">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms">Terms</Link>
            <span aria-hidden="true">·</span>
            <Link to="/refund">Refund</Link>
          </div>
          <span className="landing-footer-copyright">© 2026 Saahvik</span>
        </div>
      </footer>
    </div>
  );
}
