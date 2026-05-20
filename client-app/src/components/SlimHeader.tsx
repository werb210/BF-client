// BF_CLIENT_BLOCK_v75_FORMS_AUTH_AND_SLIM_HEADER_v1
// Slim header for surfaces inside the app shell (wizard, mini-portal).
// Public/header_white.png is the white-mountains lockup already shipped in
// the bundle. Dark navy background (#0B1320) matches BF-Website and the
// LandingHeader so the brand reads consistently across the entire client
// journey: email → website → apply wizard → mini-portal.
import { memo } from "react";

const HEADER_HEIGHT = 56; // matches BF-Website mobile header height

const styles = {
  outer: {
    width: "100%",
    background: "#0B1320",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    height: HEADER_HEIGHT,
    padding: "0 16px",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  brandLink: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 10,
    textDecoration: "none",
    color: "inherit",
    // 44px tap target per Apple HIG
    minHeight: 44,
  },
  logo: {
    height: 28,
    width: "auto",
    display: "block",
  },
  wordmark: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.01em",
  },
};

type SlimHeaderProps = {
  /** Optional right-side slot — e.g. step indicator, call-us link, sign-out */
  right?: React.ReactNode;
};

function SlimHeader({ right }: SlimHeaderProps) {
  return (
    <header style={styles.outer} role="banner" data-bf-slim-header>
      <div style={styles.inner}>
        <a
          href="https://boreal.financial/"
          style={styles.brandLink}
          aria-label="Boreal Financial home"
        >
          <img
            src="/header_white.png"
            alt=""
            style={styles.logo}
            width={140}
            height={28}
            decoding="async"
          />
        </a>
        {right ?? null}
      </div>
    </header>
  );
}

export default memo(SlimHeader);
