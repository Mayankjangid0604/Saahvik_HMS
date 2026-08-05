import { LegalLayout } from "./LegalLayout";
import "./LegalPage.css";

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="August 2026">
      <h2>Acceptance</h2>
      <p>
        By creating a Saahvik account, you (the &ldquo;Customer&rdquo;) agree to these Terms. If
        you are creating an account on behalf of an organisation, you represent that you have
        authority to bind that organisation.
      </p>

      <h2>The Service</h2>
      <p>
        Saahvik provides cloud-based hostel management software on a subscription basis. We
        reserve the right to modify features with reasonable notice.
      </p>

      <h2>Account</h2>
      <p>
        You must provide accurate information during signup. You are responsible for all
        activity under your account. You must notify us immediately at{" "}
        <a href="mailto:contact@saahvik.com">contact@saahvik.com</a> if you suspect unauthorised
        access.
      </p>

      <h2>Subscription and Payment</h2>
      <p>
        Subscriptions are prepaid and billed monthly, half-yearly, or yearly as selected. Prices
        are listed at{" "}
        <a href="https://www.saahvik.com/#pricing">www.saahvik.com</a>. We reserve the
        right to change pricing with 30 days&rsquo; notice. Continued use after a price change
        constitutes acceptance.
      </p>

      <h2>Your Data</h2>
      <p>
        All operational data you enter (resident records, payment records, etc.) belongs to you.
        We process it only to provide the service. You may export your data at any time from the
        Data Export screen. Upon account termination, data is available for download for 30
        days, after which it is deleted in accordance with our Privacy Policy.
      </p>

      <h2>Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Saahvik for any unlawful purpose.</li>
        <li>Attempt to gain unauthorised access to any part of the service.</li>
        <li>Upload malicious code.</li>
        <li>Resell or sublicense the service.</li>
        <li>Use the service to harm or harass individuals.</li>
      </ul>

      <h2>Service Availability</h2>
      <p>
        We target 99.5% monthly uptime. Planned maintenance is announced at least 24 hours in
        advance. We are not liable for downtime caused by factors outside our control.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Saahvik&rsquo;s liability for any claim is
        limited to the amount paid by the Customer in the three months preceding the claim. We
        are not liable for indirect, incidental, or consequential damages.
      </p>

      <h2>Termination</h2>
      <p>
        You may cancel your subscription at any time. Cancellation takes effect at the end of
        the current billing period. We may terminate accounts that violate these Terms, with 7
        days&rsquo; notice except in cases of severe violation.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws of India. Disputes shall be subject to the
        exclusive jurisdiction of courts in Rajasthan, India.
      </p>

      <div className="legal-contact-box">
        <p>
          For any questions about these Terms, email{" "}
          <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
