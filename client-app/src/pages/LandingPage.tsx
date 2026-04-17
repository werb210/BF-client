import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>Boreal Financial</div>
        <button
          onClick={() => navigate("/otp")}
          style={{ padding: "10px 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 15 }}
        >
          Get Started →
        </button>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 60px", background: "#fff" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#1e3a5f", margin: "0 0 16px", lineHeight: 1.2 }}>
          Professional Business Financing Solutions
        </h1>
        <p style={{ fontSize: 18, color: "#64748b", maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Connecting Canadian and US businesses with tailored financing solutions. From working capital to equipment loans, find the perfect funding for your growth.
        </p>
        <button
          onClick={() => navigate("/otp")}
          style={{ padding: "14px 32px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
        >
          Start Your Application →
        </button>
      </section>

      {/* 3 Feature Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, padding: "0 40px 60px", background: "#fff" }}>
        {[
          { icon: "📄", title: "Streamlined Application", desc: "Complete your business loan application in minutes with our intuitive, multi-step process." },
          { icon: "💰", title: "Competitive Rates", desc: "Access competitive financing options tailored to your business needs and industry." },
          { icon: "🛡️", title: "Secure & Compliant", desc: "Bank-level security with full compliance to financial regulations and data protection." },
        ].map((f) => (
          <div key={f.title} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#1e3a5f" }}>{f.title}</h3>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Why Choose */}
      <section style={{ background: "#f8fafc", padding: "60px 40px" }}>
        <h2 style={{ textAlign: "center", fontSize: 30, fontWeight: 800, color: "#1e3a5f", marginBottom: 40 }}>Why Choose Boreal Financial?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800, margin: "0 auto" }}>
          {[
            { title: "Fast Approval", desc: "Get decisions within 24–48 hours with our streamlined process." },
            { title: "Flexible Terms", desc: "6 months to 10 years repayment options to match your cash flow." },
            { title: "No Hidden Fees", desc: "Transparent pricing with clear terms and no surprise charges." },
            { title: "Expert Support", desc: "Dedicated financing specialists available throughout the process." },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ color: "#10b981", fontSize: 20, marginTop: 2 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: "#64748b", fontSize: 14 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", padding: "40px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <div><div style={{ fontSize: 36, fontWeight: 800, color: "#1e3a5f" }}>83+</div><div style={{ color: "#64748b" }}>Active Lenders</div></div>
        <div><div style={{ fontSize: 36, fontWeight: 800, color: "#f59e0b" }}>5–7</div><div style={{ color: "#64748b" }}>Day Processing</div></div>
        <div><div style={{ fontSize: 36, fontWeight: 800, color: "#10b981" }}>$30M+</div><div style={{ color: "#64748b" }}>Maximum Funding</div></div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: "center", padding: "60px 24px", background: "#fff" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a5f", marginBottom: 12 }}>Ready to Grow Your Business?</h2>
        <p style={{ color: "#64748b", marginBottom: 28 }}>Join thousands of businesses that have secured funding through our platform. Start your application today.</p>
        <button
          onClick={() => navigate("/otp")}
          style={{ padding: "14px 36px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
        >
          Apply Now →
        </button>
      </section>

      {/* Maya chat bubble */}
      <button
        onClick={() => navigate("/otp")}
        style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#1e3a5f", color: "#fff", border: "none", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}
        title="Start application"
      >
        💬
      </button>
    </div>
  );
}
