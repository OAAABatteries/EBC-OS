// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Privacy Policy
//  Required for App Store & Google Play submission.
//  Accessible at /#/privacy (public, no auth required)
// ═══════════════════════════════════════════════════════════════

export default function PrivacyPolicy() {
  const LAST_UPDATED = "April 15, 2026";
  const COMPANY = "Eagles Brothers Constructors";
  const APP_NAME = "Eagles Brothers Constructors (EBC-OS)";
  const CONTACT_EMAIL = "privacy@ebconstructors.com";
  const WEBSITE = "https://ebconstructors.com";

  return (
    <div style={{ background: "#06080c", color: "#e5e7eb", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", lineHeight: 1.6, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, color: "#fbbf24", marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: "#9ca3af", margin: 0 }}>Last updated: {LAST_UPDATED}</p>
          <p style={{ color: "#9ca3af", margin: "8px 0 0 0" }}>{COMPANY} · Houston, Texas</p>
        </div>

        <Section title="Overview">
          <p>This Privacy Policy describes how {COMPANY} ("we", "us", "our") collects, uses, and protects your information when you use {APP_NAME} ("the App"). The App is a construction operations management tool used by {COMPANY} employees, contractors, and authorized business partners.</p>
          <p><strong>Key principle:</strong> The App is an internal business tool. We do not sell, rent, or share your personal information with third parties for marketing purposes. Ever.</p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect information you provide directly to us and information generated through your use of the App:</p>
          <ul>
            <li><strong>Account information:</strong> Name, email address, role (employee, foreman, PM, etc.), and hashed password.</li>
            <li><strong>Profile information:</strong> Phone number, hourly rate, trade, certifications, and emergency contact (as entered by you or an administrator).</li>
            <li><strong>Work-related data:</strong> Time entries, clock-in/clock-out locations, daily reports, material requests, delivery status, safety incidents, JSAs, project notes, and other job-related records you create or that are assigned to you.</li>
            <li><strong>Device location:</strong> When you use clock-in verification, delivery tracking, or site geofencing features, the App records your GPS coordinates. Location is used only for the specific feature you activate.</li>
            <li><strong>Camera/photo access:</strong> Photos you take or select to attach to material requests, RFIs, daily reports, load verifications, or punch items.</li>
            <li><strong>Device information:</strong> Basic device type, operating system version, and app version for diagnostic purposes.</li>
          </ul>
        </Section>

        <Section title="How We Use Information">
          <ul>
            <li>To operate the App and provide features you request (clock-in, scheduling, project management, reporting).</li>
            <li>To calculate payroll, labor costs, and project profitability.</li>
            <li>To verify work performed and maintain records required by contract and law.</li>
            <li>To send notifications relevant to your job (shift changes, safety alerts, deliveries, RFIs).</li>
            <li>To maintain the security and integrity of company operations.</li>
            <li>To comply with legal, tax, and regulatory obligations.</li>
          </ul>
        </Section>

        <Section title="Permissions We Request">
          <ul>
            <li><strong>Camera:</strong> Only when you tap a camera/attach button. Photos stay within the App unless you export them.</li>
            <li><strong>Photo Library:</strong> Only when you choose to attach an existing photo. We do not scan your library.</li>
            <li><strong>Location (while using app):</strong> Only when you clock in, verify delivery arrival, or use a geofence feature. Location is not tracked continuously.</li>
            <li><strong>Location (background):</strong> Only for roles and features that require ongoing delivery route tracking. You can disable this in your device settings at any time.</li>
            <li><strong>Push notifications:</strong> For job-critical alerts. Optional. You can disable them anytime.</li>
          </ul>
        </Section>

        <Section title="Data Storage & Security">
          <ul>
            <li>Your data is stored on servers operated by Supabase (our database provider) and within your device's local storage.</li>
            <li>Passwords are hashed before storage; we never store them in plain text.</li>
            <li>Transmission between your device and our servers uses encrypted HTTPS connections.</li>
            <li>Administrative access is restricted to authorized {COMPANY} personnel with a legitimate business need.</li>
            <li>We retain data for as long as required for business operations and legal compliance. Inactive records may be archived or anonymized after 7 years.</li>
          </ul>
        </Section>

        <Section title="Data Sharing">
          <p>We share data only under these limited circumstances:</p>
          <ul>
            <li><strong>Within the company:</strong> Authorized employees, contractors, and supervisors may access data relevant to their role.</li>
            <li><strong>Service providers:</strong> Supabase (database), QuickBooks (when you connect your account for accounting integration), and push notification services. These providers are contractually bound to protect your data.</li>
            <li><strong>General Contractors / Project Owners:</strong> Limited information (progress reports, submitted RFIs, change orders, approved invoices) may be shared with GCs as required for project delivery.</li>
            <li><strong>Legal compliance:</strong> When required by law, subpoena, audit, or other legal process.</li>
          </ul>
          <p><strong>We never sell personal information or share it for marketing or advertising.</strong></p>
        </Section>

        <Section title="Your Rights">
          <ul>
            <li>Request a copy of the personal data we hold about you.</li>
            <li>Request corrections to inaccurate data.</li>
            <li>Request deletion of your account and data, subject to legal retention requirements.</li>
            <li>Opt out of non-essential push notifications at any time in your device settings.</li>
            <li>Withdraw location or camera permissions at any time in your device settings.</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#fbbf24" }}>{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="Children's Privacy">
          <p>The App is not intended for anyone under 18. We do not knowingly collect information from minors. If you believe a minor has created an account, contact us immediately for removal.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Material changes will be communicated within the App or by email. Continued use of the App after an update constitutes acceptance of the revised policy.</p>
        </Section>

        <Section title="Contact">
          <p>For privacy questions, data requests, or concerns:</p>
          <ul>
            <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#fbbf24" }}>{CONTACT_EMAIL}</a></li>
            <li>Website: <a href={WEBSITE} style={{ color: "#fbbf24" }}>{WEBSITE}</a></li>
            <li>Mail: {COMPANY}, Houston, TX</li>
          </ul>
        </Section>

        <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid #374151", textAlign: "center", color: "#6b7280", fontSize: 14 }}>
          <p>© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
          <p><a href="/" style={{ color: "#fbbf24", textDecoration: "none" }}>← Return to app</a></p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 22, color: "#f3f4f6", marginBottom: 12, borderBottom: "1px solid #374151", paddingBottom: 6 }}>{title}</h2>
      <div style={{ color: "#d1d5db" }}>{children}</div>
    </section>
  );
}
