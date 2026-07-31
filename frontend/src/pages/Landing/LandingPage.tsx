import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, GlobeIcon, MailIcon, WhatsAppIcon } from "./icons";
import {
  ADDON_GROUPS,
  BILLING_CYCLES,
  COMPARISON,
  ENTERPRISE,
  FEATURE_EXPLANATIONS,
  PLANS,
} from "./plans";
import type { CycleId } from "./plans";
import "./LandingPage.css";

interface WorkflowSection {
  title: string;
  description: string;
  bullets: readonly string[];
  /** Present when the stage unlocks above Basic. */
  tierNote?: string;
}

const WORKFLOW_SECTIONS: readonly WorkflowSection[] = [
  {
    title: "Know your occupancy, always",
    description:
      "The register book, replaced — every bed in every room, live, with nothing to tally by hand.",
    bullets: [
      "Bed-level occupancy tracking on a real-time occupancy dashboard",
      "Room & bed allocation, transfer with immutable history",
      "Bulk room setup",
      "Floor and building hierarchy as you grow",
    ],
  },
  {
    title: "Collect fees without losing track",
    description:
      "Record money the way you actually collect it — cash, UPI, bank transfer — or let residents pay online.",
    bullets: [
      "Fee structures, manual payment recording & PDF receipts",
      "Dues tracking with automatic reminders",
      "Partial payments, refunds, deposits, late fees & waivers",
      "Online collection via Razorpay, GST & full accounting at higher tiers",
    ],
  },
  {
    title: "Run the front desk, properly",
    description:
      "Visitors, attendance, curfew, leave, and parcels — the everyday movements of a hostel, logged.",
    tierNote: "Beginner and above",
    bullets: [
      "Visitor management with pre-approval & resident alerts",
      "Resident in/out register, curfew & late-entry alerts",
      "Leave applications with guardian notification",
      "Parcel register with pickup confirmation",
    ],
  },
  {
    title: "Handle complaints and staff, accountably",
    description:
      "A written record of what was reported, who handled it, and what they did.",
    bullets: [
      "Complaint logging with photo attachments & status tracking",
      "Staff accounts with role-based access",
      "Staff attendance, leave & shift scheduling from Beginner",
      "Audit log of every action taken",
    ],
  },
  {
    title: "Reports that answer real questions",
    description:
      "Who's staying, who owes, and what came in this month — exportable, schedulable, and buildable.",
    bullets: [
      "Occupancy, dues, resident list & monthly collection reports",
      "PDF export on every plan, Excel from Beginner",
      "Role-based dashboards & scheduled reports",
      "Custom report builder & advanced analytics at Professional",
    ],
  },
  {
    title: "Automate, integrate, and go mobile",
    description:
      "As your operation grows, Saahvik grows with it — apps, automation, and an AI assistant.",
    tierNote: "Beginner and above",
    bullets: [
      "Operations app for staff, Resident app at Professional",
      "WhatsApp, SMS & push notifications",
      "No-code workflow builder, REST API & webhooks",
      "AI assistant, drafted communication & report summaries",
    ],
  },
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

function Wordmark({ withBadge = true }: { withBadge?: boolean }) {
  return (
    <span className="wordmark">
      {withBadge && (
        <img
          src="/brand/saahvik-mark.png"
          alt=""
          className="wordmark-badge"
          width={40}
          height={40}
        />
      )}
      <span className="wordmark-text">Saahvik</span>
    </span>
  );
}

/** Public entry page at "/" — pre-auth, so no app shell and no data fetching. */
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [cycle, setCycle] = useState<CycleId>("monthly");
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
    // TODO: POST to a real contact/lead endpoint — none exists yet, so this only
    // confirms locally and drops the data.
    setContactSubmitted(true);
  }

  return (
    <div className="landing" ref={rootRef}>
      <header className={scrolled ? "landing-nav is-scrolled" : "landing-nav"}>
        <div className="landing-container landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="Saahvik home">
            <Wordmark />
          </Link>
          <nav className="landing-nav-actions" aria-label="Primary">
            <a
              href="#features"
              className="landing-nav-link landing-nav-link-secondary"
              onClick={(e) => scrollToSection(e, "features")}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="landing-nav-link landing-nav-link-secondary"
              onClick={(e) => scrollToSection(e, "pricing")}
            >
              Pricing
            </a>
            <Link to="/login" className="landing-nav-link">
              Log in
            </Link>
            <Link to="/signup" className="btn btn-nav">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-heading">
          <HeroGridMotif />
          <div className="landing-container hero-content">
            <p className="hero-live-pill">
              <span className="hero-live-dot" aria-hidden="true" />
              Now live — Hostel Management, Reimagined
            </p>
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
              <Link to="/signup" className="btn btn-gold">
                Get Started
              </Link>
              <a
                href="#pricing"
                className="hero-secondary-link"
                onClick={(e) => scrollToSection(e, "pricing")}
              >
                See plans &amp; pricing <span aria-hidden="true">→</span>
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
                Everything a hostel needs
              </h2>
              <p className="section-subline">
                Six stages of running a hostel, covered end to end — from a single
                PG to a multi-property chain.
              </p>
            </div>
            <div className="workflows-list">
              {WORKFLOW_SECTIONS.map(({ title, description, bullets, tierNote }) => (
                <article key={title} className="workflow-row" data-reveal>
                  <div className="workflow-intro">
                    <h3 className="workflow-title">{title}</h3>
                    {tierNote && <p className="workflow-tier">{tierNote}</p>}
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
              standard on every plan — not an upsell. Your records live in a
              managed database with automated daily backups, not a spreadsheet
              on someone's laptop.
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
                Plans &amp; pricing
              </h2>
              <p className="section-subline">
                Four plans, one add-on catalog, and a build-your-own Enterprise
                model. No hidden charges. No per-student fees.
              </p>
            </div>

            <div className="founding-banner" data-reveal>
              <strong>Launch offer:</strong> the first 30 hostels get 6 months
              completely free, a founding-member price locked for life, and
              direct WhatsApp support from the founder.{" "}
              <a
                href="#contact"
                className="founding-banner-link"
                onClick={(e) => scrollToSection(e, "contact")}
              >
                Claim a founding spot →
              </a>
            </div>

            <div
              className="cycle-toggle"
              role="radiogroup"
              aria-label="Billing cycle"
              data-reveal
            >
              {BILLING_CYCLES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={cycle === option.id}
                  className={
                    cycle === option.id ? "cycle-option is-active" : "cycle-option"
                  }
                  onClick={() => setCycle(option.id)}
                >
                  {option.label}
                  {option.badge && (
                    <span className="cycle-badge">{option.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="pricing-grid">
              {PLANS.map((plan) => {
                const price = plan.pricing[cycle];
                return (
                  <article key={plan.id} className="pricing-card" data-reveal>
                    <div className="pricing-card-head">
                      <h3 className="pricing-plan-name">{plan.name}</h3>
                      <p className="pricing-tagline">{plan.tagline}</p>
                      <p className="pricing-price">
                        <span className="pricing-amount">₹{price.amount}</span>
                        <span className="pricing-period">{price.per}</span>
                      </p>
                      <p className="pricing-effective">
                        {price.effective ?? " "}
                      </p>
                      <Link to="/signup" className="btn btn-sapphire btn-card">
                        Get Started
                      </Link>
                    </div>
                    <ul className="pricing-limits">
                      {plan.limits.map((limit) => (
                        <li key={limit}>
                          <span className="pricing-check" aria-hidden="true">
                            <CheckIcon />
                          </span>
                          {limit}
                        </li>
                      ))}
                    </ul>
                    <div className="pricing-features">
                      <p className="pricing-features-label">
                        {plan.inheritsLabel ?? "Includes"}
                      </p>
                      <ul>
                        {plan.features.map((feature) => {
                          const tip = FEATURE_EXPLANATIONS[feature];
                          return (
                            <li key={feature} title={tip} className={tip ? "has-tip" : ""}>
                              {feature}
                              {tip && <span className="feature-info" aria-label="More info">?</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="enterprise-band" data-reveal>
              <div className="enterprise-copy">
                <h3 className="enterprise-title">Enterprise — build your own</h3>
                <p>
                  No fixed bundle. Start from a base platform fee of{" "}
                  <span className="num">₹{ENTERPRISE.baseFee.monthly}</span>/month
                  (org account, core platform, full authentication with 2FA), then
                  compose exactly the capacity, features, support level, and data
                  protection you need from the add-on catalogs below. Minimum bill{" "}
                  <span className="num">₹{ENTERPRISE.floor.monthly}</span>/month.
                </p>
              </div>
              <a
                href="#contact"
                className="btn btn-gold-outline"
                onClick={(e) => scrollToSection(e, "contact")}
              >
                Talk to us
              </a>
            </div>

            <details className="pricing-details" data-reveal>
              <summary>
                <span className="pricing-details-title">Compare all plans, feature by feature</span>
                <span className="pricing-details-hint" aria-hidden="true">+</span>
              </summary>
              <div className="compare-scroll">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="visually-hidden">Feature</span>
                      </th>
                      {PLANS.map((plan) => (
                        <th scope="col" key={plan.id}>
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {COMPARISON.map((section) => (
                    <tbody key={section.title}>
                      <tr className="compare-section-row">
                        <th scope="rowgroup" colSpan={5}>
                          {section.title}
                        </th>
                      </tr>
                      {section.rows.map((row) => (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          {row.values.map((value, i) => (
                            <td
                              key={PLANS[i].id}
                              className={value === "—" ? "compare-no" : "compare-yes"}
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
              <p className="compare-footnote">
                Enterprise composes any of the above à la carte on top of its base
                fee — every limit and capability is individually purchasable.
              </p>
            </details>

            <div id="addons" className="addons" data-reveal>
              <h3 className="addons-heading">Extend any plan with add-ons</h3>
              <p className="addons-blurb">
                Every add-on is available on monthly, half-yearly, and yearly
                billing —{" "}
                <a
                  href="#contact"
                  className="addons-blurb-link"
                  onClick={(e) => scrollToSection(e, "contact")}
                >
                  talk to us
                </a>{" "}
                for pricing.
              </p>
              {ADDON_GROUPS.map((group) => (
                <details key={group.id} className="pricing-details addon-details">
                  <summary>
                    <span className="pricing-details-title">{group.title}</span>
                    <span className="pricing-details-hint" aria-hidden="true">+</span>
                  </summary>
                  <p className="addon-group-blurb">{group.blurb}</p>
                  <div className="compare-scroll">
                    <table className="compare-table addon-table">
                      <thead>
                        <tr>
                          <th scope="col">Add-on</th>
                          <th scope="col">Unit</th>
                          <th scope="col">Available on</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.name}>
                            <th scope="row">{row.name}</th>
                            <td>{row.unit}</td>
                            <td>{row.appliesTo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {group.footnotes?.map((note) => (
                    <p key={note} className="compare-footnote">
                      {note}
                    </p>
                  ))}
                </details>
              ))}
            </div>
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
                Bring your hostel onto Saahvik today
              </h2>
              <p className="contact-subline">
                Sign up and set your hostel up in minutes — or tell us a little
                about it and we'll call you back and do it with you.
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
              <Link to="/signup" className="btn btn-gold contact-signup-cta">
                Get Started now
              </Link>
            </div>
            <div className="contact-form-card" data-reveal>
              {contactSubmitted ? (
                <div className="contact-thanks" role="status">
                  <h3 className="contact-thanks-title">Thank you!</h3>
                  <p>
                    We've noted your details. We'll reach out on the phone number
                    you shared — usually within a day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <p className="contact-form-title">Request a callback</p>
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
                    Request a callback
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
            <Wordmark />
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
