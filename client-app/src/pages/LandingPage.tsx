import { Link } from "react-router-dom";
import LandingHeader from "@/components/landing/LandingHeader";
import "@/components/landing/landing-shell.css";

export default function LandingPage() {
  return (
    <div className="landing-shell">
      <LandingHeader />

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">
              Business financing,
              <br />
              made simple.
            </h1>
            <p>Access the right financing options for your business.</p>
          </div>

          <div
            className="landing-art"
            role="img"
            aria-label="Business financing illustration"
            data-testid="landing-art-placeholder"
          />

          <div className="landing-actions">
            <Link className="landing-primary-cta" to="/otp">
              Get Started
            </Link>
            <p className="landing-sign-in">
              Already have an application? <Link to="/otp">Sign in</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-trust">
        <span>Your information is secure and confidential.</span>
        <span aria-hidden="true">•</span>
        <a href="https://www.boreal.financial/privacy">Privacy</a>
      </footer>
    </div>
  );
}
