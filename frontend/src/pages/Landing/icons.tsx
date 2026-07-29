import type { SVGProps } from "react";

/**
 * Hand-authored line icons for the landing page.
 * 1.5px stroke, currentColor — keep everything consistent in weight.
 */
const iconAttrs = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

/** Small tick used in the pricing card's limits list. */
export function CheckIcon() {
  return (
    <svg {...iconAttrs} width={16} height={16} viewBox="0 0 16 16">
      <path d="m3 8.5 3.2 3.2L13 4.5" />
    </svg>
  );
}

/** Speech bubble with a handset — the WhatsApp contact line. */
export function WhatsAppIcon() {
  return (
    <svg {...iconAttrs} width={20} height={20} viewBox="0 0 20 20">
      <path d="M10 2.5a7.5 7.5 0 0 0-6.42 11.38L2.5 17.5l3.72-1.04A7.5 7.5 0 1 0 10 2.5Z" />
      <path d="M7.3 6.9c-.3.9 0 2.2 1.2 3.5 1.3 1.4 2.8 2 3.7 1.7l.6-1.2-1.6-.9-.7.6c-.5-.2-1.3-.9-1.6-1.5l.5-.7-.9-1.7Z" />
    </svg>
  );
}

/** Envelope — the email contact line. */
export function MailIcon() {
  return (
    <svg {...iconAttrs} width={20} height={20} viewBox="0 0 20 20">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="m3.5 6 6.5 5 6.5-5" />
    </svg>
  );
}

/** Simple globe — the website contact line. */
export function GlobeIcon() {
  return (
    <svg {...iconAttrs} width={20} height={20} viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5c-4 4.7-4 10.3 0 15M10 2.5c4 4.7 4 10.3 0 15" />
    </svg>
  );
}
