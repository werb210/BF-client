import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const DRAWER_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/portal", label: "My Application" },
];

function MenuIcon({ close = false }: { close?: boolean }) {
  return <span className={close ? "menu-icon menu-icon--close" : "menu-icon"} aria-hidden="true" />;
}

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link to="/" className="landing-brand" aria-label="Boreal Financial home" data-testid="landing-logo">
          <img src="/header.png" alt="Boreal Financial" />
        </Link>
        <button
          type="button"
          className="landing-menu-button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="landing-drawer"
          data-testid="landing-mobile-toggle"
        >
          <MenuIcon />
        </button>
      </div>

      <div className={`landing-drawer-layer${open ? " is-open" : ""}`} aria-hidden={!open} data-testid="landing-drawer-layer">
        <button
          type="button"
          className="landing-drawer-overlay"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          data-testid="landing-drawer-overlay"
        />
        <aside id="landing-drawer" className="landing-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="landing-drawer__header">
            <Link to="/" className="landing-brand" onClick={() => setOpen(false)}>
              <img src="/header.png" alt="Boreal Financial" />
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className="landing-menu-button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              data-testid="landing-drawer-close"
              tabIndex={open ? 0 : -1}
            >
              <MenuIcon close />
            </button>
          </div>

          <nav className="landing-drawer__nav" aria-label="Primary navigation">
            {DRAWER_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={item.to === "/" ? "is-active" : undefined}
                aria-current={item.to === "/" ? "page" : undefined}
                onClick={() => setOpen(false)}
                tabIndex={open ? 0 : -1}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="landing-drawer__bottom">
            <a href="https://www.boreal.financial/contact" tabIndex={open ? 0 : -1}>Support</a>
            <Link to="/otp" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>Sign in</Link>
            <p>Secure business financing, built around you.</p>
          </div>
        </aside>
      </div>
    </header>
  );
}
