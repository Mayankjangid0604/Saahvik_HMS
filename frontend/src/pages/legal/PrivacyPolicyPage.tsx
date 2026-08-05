import { LegalLayout } from "./LegalLayout";
import "./LegalPage.css";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="August 2026">
      <h2>Introduction</h2>
      <p>
        Saahvik is operated by Saahvik, a software product for hostel management. This policy
        explains what data we collect, why we collect it, and how we protect it, in compliance
        with India&rsquo;s Digital Personal Data Protection Act, 2023 (DPDP Act).
      </p>

      <h2>Data We Collect</h2>
      <h3>Account data</h3>
      <p>
        Name, email address, mobile number, organisation name, and password (hashed, never
        stored in plain text).
      </p>
      <h3>Hostel operational data</h3>
      <p>
        Resident personal details (name, Aadhar number, guardian contacts, coaching institute,
        photo), room and bed assignments, payment records, attendance and leave records, and
        complaint records — all entered by the hostel operator.
      </p>
      <h3>Technical data</h3>
      <p>
        Browser type, IP address, pages visited, and session duration — collected automatically
        for security and performance.
      </p>

      <h2>How We Use Your Data</h2>
      <ul>
        <li>To provide and operate the Saahvik service.</li>
        <li>To send transactional emails (fee receipts, OTP codes, reminders) via AWS SES.</li>
        <li>To process payments via Razorpay.</li>
        <li>To generate reports and analytics for your account.</li>
        <li>To detect and prevent fraud and unauthorised access.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>We share data only with:</p>
      <ul>
        <li>
          <strong>Razorpay</strong> for payment processing — governed by their privacy policy.
        </li>
        <li>
          <strong>AWS</strong> for hosting, database, and email infrastructure — all data stored
          in the ap-south-1 (Mumbai) region.
        </li>
        <li>
          <strong>Law enforcement or government authorities</strong> when required by law.
        </li>
      </ul>
      <p>
        We do not sell your data. We do not share resident data with any third party for
        advertising.
      </p>

      <h2>Data Storage and Security</h2>
      <p>
        All data is stored in AWS RDS PostgreSQL in the Mumbai region (ap-south-1). We use
        automated daily backups, encryption at rest, and TLS in transit. Staff access is
        protected by two-factor authentication.
      </p>

      <h2>Data Retention</h2>
      <p>
        Account and operational data is retained for the duration of the active subscription and
        for 12 months after account termination. You may request earlier deletion by writing to{" "}
        <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>.
      </p>

      <h2>Your Rights (DPDP Act 2023)</h2>
      <p>As a data principal under the DPDP Act, you have the right to:</p>
      <ul>
        <li>Access information about data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>
          Nominate another person to exercise rights on your behalf in case of death or
          incapacity.
        </li>
      </ul>
      <p>
        To exercise these rights, email{" "}
        <a href="mailto:contact@saahvik.com">contact@saahvik.com</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only essential session cookies required for authentication. We do not use
        advertising cookies or third-party tracking cookies.
      </p>

      <h2>Children&rsquo;s Data</h2>
      <p>
        Our platform is used by hostel operators to manage student residents, who may be minors.
        Hostel operators are the data fiduciaries for resident data and are responsible for
        obtaining appropriate consent from guardians.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We will notify account owners by email at least 14 days before any material change to
        this policy.
      </p>

      <div className="legal-contact-box">
        <p>
          For any privacy questions or to exercise your rights, contact us at{" "}
          <a href="mailto:contact@saahvik.com">contact@saahvik.com</a> or call{" "}
          <a href="tel:+919530301131">+91 9530301131</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
