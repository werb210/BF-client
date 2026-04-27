// BF_LANDING_RESTORED_v25 — Block 25
// Restored hero landing page. The OTP gate happens after the user clicks
// "Start Your Application". Do not redirect / to /otp; the marketing hero
// belongs here.
import React from 'react';
import { Link } from 'react-router-dom';
import PhoneOTPInline from '../components/PhoneOTPInline';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f172a' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 32px', borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Boreal Financial</div>
        <Link
          to="/otp"
          style={{
            padding: '10px 20px', background: '#1e3a8a', color: '#fff',
            borderRadius: 6, textDecoration: 'none', fontWeight: 600,
          }}
        >Get Started →</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <h1 style={{ fontSize: 56, lineHeight: 1.1, margin: 0, fontWeight: 800, color: '#0f172a' }}>
          Professional Business Financing Solutions
        </h1>
        <p style={{ fontSize: 18, color: '#475569', marginTop: 24, maxWidth: 760, lineHeight: 1.5 }}>
          Connecting Canadian and US businesses with tailored financing solutions.
          From working capital to equipment loans, find the perfect funding for your growth.
        </p>

        { /* BF_LANDING_OTP_INLINE_v27 */ }
        <div style={{ marginTop: 32, maxWidth: 460 }}>
          <PhoneOTPInline />
        </div>

        <section style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24, marginTop: 80,
        }}>
          {[
            { icon: '📄', title: 'Streamlined Application', body: 'Complete your business loan application in minutes with our intuitive, multi-step process.' },
            { icon: '💰', title: 'Competitive Rates',       body: 'Access competitive financing options tailored to your business needs and industry.' },
            { icon: '🛡️', title: 'Secure & Compliant',      body: 'Bank-level security with full compliance to financial regulations and data protection.' },
          ].map((c) => (
            <div key={c.title} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 32 }}>{c.icon}</div>
              <h3 style={{ fontSize: 20, marginTop: 12, marginBottom: 8 }}>{c.title}</h3>
              <p style={{ color: '#475569', lineHeight: 1.5, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 80, textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700 }}>Why Choose Boreal Financial?</h2>
        </section>
      </main>
    </div>
  );
}
