import { LegalLayout } from "./LegalLayout";
import "./LegalPage.css";

export function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="August 2026">
      <h2>Overview</h2>
      <p>
        Saahvik is a subscription SaaS product. This policy explains when refunds are available.
      </p>

      <h2>Monthly Subscriptions</h2>
      <p>
        Monthly subscription fees are non-refundable once the billing period begins. You may
        cancel at any time; your access continues until the end of the current billing period.
      </p>

      <h2>Half-Yearly and Yearly Subscriptions</h2>
      <p>
        If you cancel a half-yearly or yearly subscription within 7 days of the payment date and
        have not used the service beyond the initial setup (no resident records added, no
        payments recorded), you may request a full refund by emailing{" "}
        <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>. After 7 days, no refund is
        available for the current period.
      </p>

      <h2>Service Outages</h2>
      <p>
        If Saahvik is unavailable for more than 48 consecutive hours due to our infrastructure
        failure, we will credit your account with a pro-rata amount for the downtime period.
      </p>

      <h2>Founding Plan and Pilot Participants</h2>
      <p>Hostels on a free pilot period are not charged, so no refund applies.</p>

      <h2>Payment Processing</h2>
      <p>
        Refunds are processed to the original payment method through Razorpay within 5–7
        business days after approval.
      </p>

      <h2>How to Request</h2>
      <p>
        Email <a href="mailto:contact@saahvik.com">contact@saahvik.com</a> with the subject
        &ldquo;Refund Request — [your organisation name]&rdquo; and include your registered
        email address and reason. We will respond within 2 business days.
      </p>

      <div className="legal-contact-box">
        <p>
          Refund requests: <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>{" "}
          <span aria-hidden="true">·</span>{" "}
          <a href="tel:+919530301131">+91 9530301131</a>
        </p>
      </div>
    </LegalLayout>
  );
}
