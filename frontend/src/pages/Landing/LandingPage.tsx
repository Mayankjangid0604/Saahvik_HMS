import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import { Link } from "react-router-dom";
import { submitContactRequest } from "@/api/contact.api";
import { ApiRequestError } from "@/api/client";
import { CheckIcon, GlobeIcon, MailIcon, WhatsAppIcon } from "./icons";
import {
  ADDON_GROUPS,
  BILLING_CYCLES,
  COMPARISON,
  ENTERPRISE,
  FEATURE_EXPLANATIONS,
  PLANS,
} from "./plans";
import type { CycleId, Plan } from "./plans";
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

/* ---------- Motion primitives ----------
   Every animation here is gated on useReducedMotion(): when the user has asked
   for reduced motion the elements render in their final state with no transform
   and no transition, rather than a faster version of the same movement. */

/** Entry easing for section reveals — settles without visible overshoot. */
const REVEAL_SPRING = { type: "spring", stiffness: 120, damping: 20, mass: 0.9 } as const;

const REVEAL_TAGS = {
  div: motion.div,
  article: motion.article,
  details: motion.details,
} as const;

/* Extends Motion's own prop type, not React's: Motion redefines onAnimationStart
   and the drag handlers, so the plain DOM prop types are not compatible. */
interface RevealProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  /** Element to render. Defaults to a div; the others preserve page semantics. */
  as?: keyof typeof REVEAL_TAGS;
}

/**
 * Fade-and-rise on first scroll into view. Replaces the previous
 * IntersectionObserver + `.is-revealed` class pass; `once: true` keeps the
 * element settled after its entry so hover transforms are not fought over.
 */
function Reveal({ as = "div", children, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "0px 0px -32px 0px" });
  // The three motion components differ only in their element type; their props
  // and ref are checked against motion.div, which RevealProps already matches.
  const Component = REVEAL_TAGS[as] as typeof motion.div;

  if (reduceMotion) {
    return (
      <Component ref={ref} {...rest}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={REVEAL_SPRING}
      {...rest}
    >
      {children}
    </Component>
  );
}

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
  const reduceMotion = useReducedMotion();
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
        {ANIMATED_CELLS.map(([col, row], i) => {
          // Beds "fill in" one after another: opacity eases while scale springs
          // past 1 and settles, so each cell lands with a slight bounce.
          const delay = 0.7 + i * 0.45;
          return (
            <motion.rect
              key={`a-${col}-${row}`}
              className="hero-cell hero-cell-anim"
              x={col * CELL_W}
              y={row * CELL_H}
              width={CELL_W}
              height={CELL_H}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.55 }}
              animate={{ opacity: 0.13, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      opacity: { delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                      scale: { delay, type: "spring", stiffness: 260, damping: 12, mass: 0.7 },
                    }
              }
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Magnetic hover lift for a pricing card: rises, deepens, and warms to gold. */
function PricingCard({ plan, cycle }: { plan: Plan; cycle: CycleId }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.1, margin: "0px 0px -32px 0px" });
  const price = plan.pricing[cycle];

  // Side/bottom borders only — border-top is the card's 3px gold rule and must
  // not be pulled into the shorthand.
  const hover = {
    y: -6,
    scale: 1.015,
    borderLeftColor: "rgba(176, 141, 87, 0.5)",
    borderRightColor: "rgba(176, 141, 87, 0.5)",
    borderBottomColor: "rgba(176, 141, 87, 0.5)",
    boxShadow: "0 2px 4px rgba(19, 31, 56, 0.05), 0 22px 48px rgba(19, 31, 56, 0.13)",
  };

  return (
    <motion.article
      ref={ref}
      className="pricing-card"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={reduceMotion ? undefined : inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={REVEAL_SPRING}
      whileHover={reduceMotion ? undefined : hover}
      // Same lift on keyboard focus, so the affordance is not mouse-only.
      whileFocus={reduceMotion ? undefined : hover}
    >
      <div className="pricing-card-head">
        <h3 className="pricing-plan-name">{plan.name}</h3>
        <p className="pricing-tagline">{plan.tagline}</p>
        <p className="pricing-price">
          <span className="pricing-amount">₹{price.amount}</span>
          <span className="pricing-period">{price.per}</span>
        </p>
        <p className="pricing-effective">{price.effective ?? " "}</p>
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
        <p className="pricing-features-label">{plan.inheritsLabel ?? "Includes"}</p>
        <ul>
          {plan.features.map((feature) => {
            const tip = FEATURE_EXPLANATIONS[feature];
            return (
              <li key={feature} title={tip} className={tip ? "has-tip" : ""}>
                {feature}
                {tip && (
                  <span className="feature-info" aria-label="More info">
                    ?
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </motion.article>
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
  const [scrolled, setScrolled] = useState(false);
  const [cycle, setCycle] = useState<CycleId>("monthly");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contactSubmitting) return;
    // Read the fields before the first await — React nulls out currentTarget
    // once the handler yields.
    const fields = new FormData(event.currentTarget);
    const read = (key: string) => String(fields.get(key) ?? "").trim();

    setContactSubmitting(true);
    setContactError(null);
    try {
      await submitContactRequest({
        name: read("name"),
        hostelName: read("hostelName"),
        phone: read("phone"),
        beds: Number(read("beds")),
      });
      setContactSubmitted(true);
    } catch (error) {
      // Only confirm on a real 2xx — a dropped lead the owner thinks was sent
      // is worse than an honest error.
      setContactError(
        error instanceof ApiRequestError && error.message
          ? error.message
          : "Something went wrong sending that. Please try again, or reach us on WhatsApp.",
      );
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <div className="landing">
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
          <Reveal className="landing-container landing-narrow">
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
          </Reveal>
        </section>

        <section
          id="features"
          className="landing-workflows"
          aria-labelledby="features-heading"
        >
          <div className="landing-container">
            <Reveal className="workflows-header">
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="features-heading" className="section-heading">
                Everything a hostel needs
              </h2>
              <p className="section-subline">
                Six stages of running a hostel, covered end to end — from a single
                PG to a multi-property chain.
              </p>
            </Reveal>
            <div className="workflows-list">
              {WORKFLOW_SECTIONS.map(({ title, description, bullets, tierNote }) => (
                <Reveal key={title} className="workflow-row" as="article">
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-trust" aria-label="Security">
          <Reveal className="landing-container landing-narrow">
            <p className="trust-copy">
              Two-factor authentication and a full login audit trail come
              standard on every plan — not an upsell. Your records live in a
              managed database with automated daily backups, not a spreadsheet
              on someone's laptop.
            </p>
          </Reveal>
        </section>

        <section
          id="pricing"
          className="landing-pricing"
          aria-labelledby="pricing-heading"
        >
          <div className="landing-container">
            <Reveal className="pricing-header">
              <div className="gold-rule" aria-hidden="true" />
              <h2 id="pricing-heading" className="section-heading">
                Plans &amp; pricing
              </h2>
              <p className="section-subline">
                Four plans, one add-on catalog, and a build-your-own Enterprise
                model. No hidden charges. No per-student fees.
              </p>
            </Reveal>

            <Reveal className="founding-banner">
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
            </Reveal>

            <Reveal
              className="cycle-toggle"
              role="radiogroup"
              aria-label="Billing cycle"
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
            </Reveal>

            <div className="pricing-grid">
              {PLANS.map((plan) => (
                <PricingCard key={plan.id} plan={plan} cycle={cycle} />
              ))}
            </div>

            <Reveal className="enterprise-band">
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
            </Reveal>

            <Reveal className="pricing-details" as="details">
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
            </Reveal>

            <Reveal id="addons" className="addons">
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
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.name}>
                            <th scope="row">{row.name}</th>
                            <td>{row.unit}</td>
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
            </Reveal>
          </div>
        </section>

        <section
          id="contact"
          className="landing-contact"
          aria-labelledby="contact-heading"
        >
          <div className="landing-container contact-inner">
            <Reveal className="contact-intro">
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
            </Reveal>
            <Reveal className="contact-form-card">
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
                  {contactError && (
                    <p className="contact-form-error" role="alert">
                      {contactError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-gold btn-form-submit"
                    disabled={contactSubmitting}
                  >
                    {contactSubmitting ? "Sending…" : "Request a callback"}
                  </button>
                </form>
              )}
            </Reveal>
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
