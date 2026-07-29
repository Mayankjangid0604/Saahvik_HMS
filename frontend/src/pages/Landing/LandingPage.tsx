import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, GlobeIcon, MailIcon, WhatsAppIcon } from "./icons";
import "./LandingPage.css";

interface WorkflowSection {
  title: string;
  description: string;
  bullets: readonly string[];
}

/* Locked Basic-plan feature set — names are verbatim from the plan spec.
   Do not add features here that aren't in that spec. */
const WORKFLOW_SECTIONS: readonly WorkflowSection[] = [
  {
    title: "Know your occupancy, always",
    description:
      "The register book, replaced — every bed in every room, live, with nothing to tally by hand.",
    bullets: [
      "Bed-level occupancy tracking on a real-time occupancy dashboard",
      "Room & bed allocation",
      "Room/bed transfer with history",
      "Bulk room setup",
    ],
  },
  {
    title: "Collect fees without losing track",
    description:
      "Record money the way you actually collect it — cash, UPI, bank transfer — and let the system remember who owes what.",
    bullets: [
      "Fee structure setup and manual payment recording (cash/UPI/bank transfer)",
      "PDF receipt generation for every payment",
      "Dues tracking with automatic reminders",
      "Partial payments, refunds, security deposit tracking, and discounts/waivers",
    ],
  },
  {
    title: "Handle complaints and staff, properly",
    description:
      "A written record of what was reported, who handled it, and what they did.",
    bullets: [
      "Complaint logging with photo attachments and status tracking",
      "Staff accounts with role-based access (up to 3 logins on Basic)",
      "Basic audit log of every action taken",
    ],
  },
  {
    title: "Reports that answer real questions",
    description:
      "Who's staying, who owes, and what came in this month — each exportable as a PDF.",
    bullets: [
      "Occupancy report",
      "Dues report",
      "Resident list report",
      "Monthly collection report",
    ],
  },
];

const BASIC_PLAN_LIMITS: readonly string[] = [
  "1 property",
  "Up to 3 staff logins",
  "Up to 150 active residents",
  "10 GB storage",
  "Every feature above included",
];

/* Hero motif: a 6×4 grid of "rooms". Some beds are already occupied (static),
   a few more fill in on load — the animation is the product's core data. */
const CELL_W = 110;
const CELL_H = 84;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const STATIC_CELLS: ReadonlyArray<[col: number, row: number]> = [
  [1, 0],
  [4, 0],
  [3, 1],
  [5, 2],
  [0, 3],
];
const ANIMATED_CELLS: ReadonlyArray<[col: number, row: number]> = [
  [5, 0],
  [2, 2],
  [1, 3],
];

function HeroGridMotif() {
  const width = GRID_COLS * CELL_W;
  const height = GRID_ROWS * CELL_H;
  const verticals = Array.from({ length: GRID_COLS + 1 }, (_, i) => i * CELL_W);
  const horizontals = Array.from({ length: GRID_ROWS + 1 }, (_, i) => i * CELL_H);
  return (
    <div className="hero-grid" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMaxYMid slice">
        <path
          className="hero-grid-lines"
          d={
            verticals.map((x) => `M${x} 0V${height}`).join("") +
            horizontals.map((y) => `M0 ${y}H${width}`).join("")
          }
        />
        {STATIC_CELLS.map(([col, row]) => (
          <rect
            key={`s-${col}-${row}`}
            className="hero-cell"
            x={col * CELL_W}
            y={row * CELL_H}
            width={CELL_W}
            height={CELL_H}
          />
        ))}
        {ANIMATED_CELLS.map(([col, row], i) => (
          <rect
            key={`a-${col}-${row}`}
            className={`hero-cell hero-cell-anim hero-cell-anim-${i + 1}`}
            x={col * CELL_W}
            y={row * CELL_H}
            width={CELL_W}
            height={CELL_H}
          />
        ))}
      </svg>
    </div>
  );
}

/** Public entry page at "/" — pre-auth, so no app shell and no data fetching. */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

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

  /* Smooth-scroll in-page anchors without a global `scroll-behavior` (this CSS
     bundle is app-wide); scroll-margin-top on the sections handles the nav. */
  function scrollToSection(event: ReactMouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    history.replaceState(null, "", `#${id}`);
  }

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: POST to a real early-access endpoint — none exists yet, so this only
    // confirms locally and drops the data.
    setContactSubmitted(true);
  }

  return (
    <div className="landing" ref={rootRef}>
      <header className={scrolled ? "landing-nav is-scrolled" : "landing-nav"}>
        <div className="landing-container landing-nav-inner">
          <Link to="/" className="landing-wordmark">
            Saahvik
          </Link>
          <nav className="landing-nav-actions" aria-label="Primary">
            <Link to="/login" className="landing-nav-link">
              Log in
            </Link>
            <a
              href="#contact"
              className="btn btn-nav"
              onClick={(e) => scrollToSection(e, "contact")}
            >
              Get Early Access
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-heading">
          <HeroGridMotif />
          <div className="landing-container hero-content">
            <p className="eyebrow">Hostel Management, Reimagined</p>
            <h1 id="hero-heading" className="hero-heading">
              Every bed. Every rupee. Every&nbsp;resident.
              <span className="hero-heading-line2">One system.</span>
            </h1>
            <p className="hero-subline">
              Saahvik replaces the register book, the WhatsApp reminders, and the
              loose payment slips with one place to run your hostel — built for
              Indian hostel owners, not adapted from a hotel platform.
            </p>
            <div className="hero-ctas">
              <a
                href="#contact"
                className="btn btn-gold"
                onClick={(e) => scrollToSection(e, "contact")}
              >
                Get Early Access
              </a>
              <a
                href="#features"
                className="hero-secondary-link"
                onClick={(e) => scrollToSection(e, "features")}
              >
                See what's included <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="landing-problem" aria-labelledby="problem-heading">
          <div className="landing-container landing-narrow" data-reveal>
            <div className="gold-rule" aria-hidden="true" />
            <h2 id="problem-heading" className="section-heading">
              Built for how hostels actually run
            </h2>
            <div className="problem-copy">
              <p>
                Most hostels still run on a register book. Occupancy lives in one
                notebook, fees in another — cash collected against handwritten
                slips, dues chased over phone calls. It works, until the register
                goes missing or a slip gets lost. Then so does the money.
              </p>
              <p>
                Saahvik digitizes exactly that workflow instead of replacing it
                with something unrecognizable. The admission form asks for the
                same fields already on your paper form — father's name, guardian
                details, Aadhar, coaching institute — typed once, stored safely,
                and searchable forever.
              </p>
              <p>
                Every bed allocated, every rupee collected, every complaint
                logged lands in one system with a full history behind it. Nothing
                depends on who was holding the register that day.
              </p>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="landing-workflows"
          aria-labelledby="features-heading"
        >
          <div className="landing-container">
            <div className="workflows-header" data-reveal>
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="features-heading" className="section-heading">
                What's included in Basic
              </h2>
              <p className="section-subline">
                Four stages of running a hostel, covered end to end.
              </p>
            </div>
            <div className="workflows-list">
              {WORKFLOW_SECTIONS.map(({ title, description, bullets }) => (
                <article key={title} className="workflow-row" data-reveal>
                  <div className="workflow-intro">
                    <h3 className="workflow-title">{title}</h3>
                    <p className="workflow-description">{description}</p>
                  </div>
                  <ul className="workflow-bullets">
                    {bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-trust" aria-label="Security">
          <div className="landing-container landing-narrow" data-reveal>
            <p className="trust-copy">
              Two-factor authentication and a full login audit trail come
              standard — not an upsell. Your records live in a managed database
              with automated daily backups, not a spreadsheet on someone's
              laptop.
            </p>
          </div>
        </section>

        <section
          id="pricing"
          className="landing-pricing"
          aria-labelledby="pricing-heading"
        >
          <div className="landing-container">
            <div className="pricing-header" data-reveal>
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="pricing-heading" className="section-heading">
                One plan to start
              </h2>
            </div>
            <div className="pricing-card" data-reveal>
              <div className="pricing-card-head">
                <h3 className="pricing-plan-name">Basic</h3>
                <p className="pricing-price">
                  <span className="pricing-amount">₹999</span>
                  <span className="pricing-period">/month</span>
                </p>
                <p className="pricing-alt">
                  or <span className="pricing-alt-amount">₹9,999</span>/year —
                  save 17%
                </p>
              </div>
              <ul className="pricing-limits">
                {BASIC_PLAN_LIMITS.map((limit) => (
                  <li key={limit}>
                    <span className="pricing-check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    {limit}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className="btn btn-sapphire"
                onClick={(e) => scrollToSection(e, "contact")}
              >
                Get Early Access
              </a>
            </div>
            <p className="pricing-upcoming" data-reveal>
              Beginner, Professional, and Business plans — for multi-building and
              multi-property operations — are launching after Basic.{" "}
              <a
                href="#contact"
                className="pricing-upcoming-link"
                onClick={(e) => scrollToSection(e, "contact")}
              >
                Get in touch
              </a>{" "}
              to be first in line.
            </p>
          </div>
        </section>

        <section
          id="contact"
          className="landing-contact"
          aria-labelledby="contact-heading"
        >
          <div className="landing-container contact-inner">
            <div className="contact-intro" data-reveal>
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="contact-heading" className="section-heading section-heading-on-dark">
                Bring your hostel onto Saahvik
              </h2>
              <p className="contact-subline">
                Tell us a little about your hostel and we'll get in touch — or
                reach us directly.
              </p>
              <ul className="contact-channels">
                <li>
                  <a href="https://wa.me/919530301131" target="_blank" rel="noreferrer">
                    <WhatsAppIcon /> WhatsApp +91 9530301131
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@saahvik.com">
                    <MailIcon /> contact@saahvik.com
                  </a>
                </li>
                <li>
                  <a href="https://www.saahvik.com" target="_blank" rel="noreferrer">
                    <GlobeIcon /> www.saahvik.com
                  </a>
                </li>
              </ul>
            </div>
            <div className="contact-form-card" data-reveal>
              {contactSubmitted ? (
                <div className="contact-thanks" role="status">
                  <h3 className="contact-thanks-title">Thank you!</h3>
                  <p>
                    We've noted your interest. We'll reach out on the phone
                    number you shared — usually within a day or two.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <div className="contact-fields">
                    <div className="contact-field">
                      <label htmlFor="contact-name">Your name</label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="contact-field">
                      <label htmlFor="contact-hostel">Hostel name</label>
                      <input
                        id="contact-hostel"
                        name="hostelName"
                        type="text"
                        autoComplete="organization"
                        required
                      />
                    </div>
                    <div className="contact-field">
                      <label htmlFor="contact-phone">Phone</label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                      />
                    </div>
                    <div className="contact-field">
                      <label htmlFor="contact-beds">Number of beds</label>
                      <input
                        id="contact-beds"
                        name="beds"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-gold btn-form-submit">
                    Request Early Access
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-wordmark landing-wordmark-footer">Saahvik</span>
            <span className="landing-footer-tagline">Smarter Hostel Management</span>
          </div>
          <div className="landing-footer-meta">
            <a href="https://wa.me/919530301131" target="_blank" rel="noreferrer">
              +91 9530301131
            </a>
            <span aria-hidden="true">·</span>
            <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>
            <span aria-hidden="true">·</span>
            <a href="https://www.saahvik.com" target="_blank" rel="noreferrer">
              www.saahvik.com
            </a>
          </div>
          <span className="landing-footer-copyright">© 2026 Saahvik</span>
        </div>
      </footer>
    </div>
  );
}
