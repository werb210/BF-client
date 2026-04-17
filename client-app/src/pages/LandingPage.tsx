import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const go = () => navigate("/otp");

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a", background: "#fff" }}>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 48px", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ fontWeight: 700, fontSize: 20 }}>Boreal Financial</span>
        <button onClick={go} style={{ padding: "10px 22px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          Get Started →
        </button>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 56px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: "#1e3a5f", margin: "0 0 16px", lineHeight: 1.15 }}>
          Professional Business Financing Solutions
        </h1>
        <p style={{ fontSize: 18, color: "#64748b", maxWidth: 620, margin: "0 auto 36px", lineHeight: 1.65 }}>
          Connecting Canadian and US businesses with tailored financing solutions. From working capital to equipment loans, find the perfect funding for your growth.
        </p>
        <button onClick={go} style={{ padding: "15px 36px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: "pointer" }}>
          Start Your Application →
        </button>
      </section>

      {/* 3 Feature Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, padding: "0 48px 64px" }}>
        {[
          { icon: "📄", title: "Streamlined Application", desc: "Complete your business loan application in minutes with our intuitive, multi-step process." },
          { icon: "💰", title: "Competitive Rates", desc: "Access competitive financing options tailored to your business needs and industry." },
          { icon: "🛡️", title: "Secure & Compliant", desc: "Bank-level security with full compliance to financial regulations and data protection." },
        ].map((f) => (
          <div key={f.title} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 28 }}>
            <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#1e3a5f" }}>{f.title}</h3>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Why Choose */}
      <section style={{ background: "#f8fafc", padding: "64px 48px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 800, color: "#1e3a5f", marginBottom: 44 }}>Why Choose Boreal Financial?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, maxWidth: 760, margin: "0 auto" }}>
          {[
            { title: "Fast Approval", desc: "Get decisions within 24–48 hours with our streamlined process." },
            { title: "Flexible Terms", desc: "6 months to 10 years repayment options to match your cash flow." },
            { title: "No Hidden Fees", desc: "Transparent pricing with clear terms and no surprise charges." },
            { title: "Expert Support", desc: "Dedicated financing specialists available throughout the process." },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#10b981", fontSize: 20, lineHeight: 1 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: "#64748b", fontSize: 14 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", padding: "48px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div><div style={{ fontSize: 40, fontWeight: 800, color: "#1e3a5f" }}>83+</div><div style={{ color: "#64748b", marginTop: 4 }}>Active Lenders</div></div>
        <div><div style={{ fontSize: 40, fontWeight: 800, color: "#f59e0b" }}>5–7</div><div style={{ color: "#64748b", marginTop: 4 }}>Day Processing</div></div>
        <div><div style={{ fontSize: 40, fontWeight: 800, color: "#10b981" }}>$30M+</div><div style={{ color: "#64748b", marginTop: 4 }}>Maximum Funding</div></div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: "center", padding: "64px 24px" }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#1e3a5f", marginBottom: 12 }}>Ready to Grow Your Business?</h2>
        <p style={{ color: "#64748b", marginBottom: 32 }}>Join thousands of businesses that have secured funding through our platform. Start your application today and get matched with the best financing options.</p>
        <button onClick={go} style={{ padding: "15px 40px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: "pointer" }}>
          Apply Now →
        </button>
      </section>

      {/* Chat bubble */}
      <button onClick={go} title="Get started" style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#1e3a5f", color: "#fff", border: "none", fontSize: 22, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        💬
      </button>
    </div>
  );
}
