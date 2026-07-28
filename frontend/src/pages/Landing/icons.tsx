import type { SVGProps } from "react";

/**
 * Hand-authored line icons for the landing page.
 * 28px grid, 1.5px stroke, currentColor — keep all three consistent in weight.
 */
const iconAttrs = {
  width: 28,
  height: 28,
  viewBox: "0 0 28 28",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

/** A 2×2 grid of beds seen from above — room & bed tracking. */
export function RoomGridIcon() {
  return (
    <svg {...iconAttrs}>
      <rect x="4" y="4.5" width="8.5" height="7" rx="1.5" />
      <rect x="15.5" y="4.5" width="8.5" height="7" rx="1.5" />
      <rect x="4" y="16.5" width="8.5" height="7" rx="1.5" />
      <rect x="15.5" y="16.5" width="8.5" height="7" rx="1.5" />
      <path d="M5.9 7.1h4.7M17.4 7.1h4.7M5.9 19.1h4.7M17.4 19.1h4.7" />
    </svg>
  );
}

/** A receipt with a rupee mark — fee collection & receipts. */
export function ReceiptRupeeIcon() {
  return (
    <svg {...iconAttrs}>
      <path d="M7 3.5h14v19l-2.33-1.6-2.34 1.6-2.33-1.6-2.33 1.6-2.34-1.6L7 22.5Z" />
      <path d="M11 8h6M11 10.5h6M11 13h1.5M12.5 13c3.33 0 3.33-5 0-5M11 13l4.25 4" />
    </svg>
  );
}

/** A person outline in a bordered card — resident records. */
export function ResidentCardIcon() {
  return (
    <svg {...iconAttrs}>
      <rect x="3.5" y="5.5" width="21" height="17" rx="2" />
      <circle cx="10.5" cy="11.5" r="2.75" />
      <path d="M6.5 19c0-2.9 1.8-4.6 4-4.6s4 1.7 4 4.6" />
      <path d="M18 10.5h3.5M18 14h3.5" />
    </svg>
  );
}
