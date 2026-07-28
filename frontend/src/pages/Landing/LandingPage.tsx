import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ReceiptRupeeIcon, ResidentCardIcon, RoomGridIcon } from "./icons";
import "./LandingPage.css";

interface Feature {
  Icon: ComponentType;
  title: string;
  body: string;
}

const FEATURES: readonly Feature[] = [
  {
    Icon: RoomGridIcon,
    title: "Room & Bed Tracking",
    body: "See every room, bed, and vacancy across all your buildings at a glance.",
  },
  {
    Icon: ReceiptRupeeIcon,
    title: "Fee Collection & Receipts",
    body: "Record payments, track dues, and issue PDF receipts in seconds.",
  },
  {
    Icon: ResidentCardIcon,
    title: "Resident Management",
    body: "Complete resident records with photos, ID documents, and history.",
  },
];

/** Public entry page at "/" — pre-auth, so no app shell and no data fetching. */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries, io) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <header className={scrolled ? "landing-nav is-scrolled" : "landing-nav"}>
        <div className="landing-container landing-nav-inner">
          {/* TODO: swap for `@/assets/brand/saahvik-wordmark.svg` once the brand asset exists. */}
          <Link to="/" className="landing-wordmark">
            Saahvik
          </Link>
          <nav className="landing-nav-actions" aria-label="Primary">
            <Link to="/login" className="landing-nav-link">
              Login
            </Link>
            <Link to="/signup" className="btn btn-nav">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-container">
            <div data-reveal>
              <div className="gold-rule" aria-hidden="true" />
              <p className="eyebrow">Hostel Management Platform</p>
              <h1 id="hero-heading" className="hero-heading">
                Smarter Hostel Management
              </h1>
              <p className="hero-subline">
                Manage rooms, residents, and fee collection from one simple dashboard.
              </p>
              <div className="hero-ctas">
                <Link to="/signup" className="btn btn-gold">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn btn-ghost">
                  Login
                </Link>
              </div>
              <p className="hero-note">No credit card required.</p>
            </div>
          </div>
        </section>

        <section className="landing-features" aria-labelledby="features-heading">
          <div className="landing-container">
            <div className="features-header" data-reveal>
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="features-heading" className="eyebrow eyebrow-on-light">
                What You Get
              </h2>
            </div>
            <div className="features-grid">
              {FEATURES.map(({ Icon, title, body }) => (
                <article key={title} className="feature-card" data-reveal>
                  <div className="feature-icon" aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-body">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span className="landing-wordmark landing-wordmark-footer">Saahvik</span>
          <div className="landing-footer-meta">
            <span>© 2026 Saahvik</span>
            <span aria-hidden="true">·</span>
            <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>
            <span aria-hidden="true">·</span>
            <a href="tel:+919530301131">+91 9530301131</a>
            <span aria-hidden="true">·</span>
            <a href="https://www.saahvik.com" target="_blank" rel="noreferrer">
              www.saahvik.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
