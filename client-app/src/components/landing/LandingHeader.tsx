// BF_CLIENT_BLOCK_v166_LANDING_HEADER_FOOTER_UNIFY_v1
// De-minified from the prior single-line export and aligned with
// BF-Website nav labels (cross-link reads "Boreal Risk Management" to
// match BF-Website v19). No visual change — same dark navy
// (#0B1320) backdrop-blur header, same mobile drawer.
// BF_CLIENT_BLOCK_v102_LOGO_LOCAL_v1 — local logo asset to avoid
// cross-origin fetch from boreal.financial in production.
import { useState } from "react";
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

const NAV_ITEMS = [
  { href: "https://www.boreal.financial/products", label: "Products" },
  { href: "https://www.boreal.financial/industries", label: "Industries" },
  { href: "https://www.boreal.financial/credit-readiness", label: "Credit Readiness" },
  { href: "https://www.boreal.financial/contact", label: "Contact" },
];

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header w-full border-b border-white/10 bg-[#0B1320]/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <a
          href="https://www.boreal.financial"
          className="flex items-center gap-3 sm:gap-4"
          onClick={() => setOpen(false)}
          data-testid="landing-logo"
        >
          <img
            src={logoUrl}
            alt=""
            className="h-10 w-auto object-contain"
            loading="lazy"
            decoding="async"
          />
          <span className="text-base font-semibold tracking-wide text-white sm:text-xl">
            Boreal Financial
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-white md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-white/80 hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://boreal.insure"
            rel="noopener noreferrer"
            className="ml-4 text-sm font-semibold text-white"
            data-testid="landing-link-boreal-insurance"
          >
            Visit Boreal Risk Management
          </a>
          <a
            href="#apply-otp"
            className="rounded-full bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-500"
            data-testid="landing-cta-apply"
          >
            Apply Now
          </a>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-white md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          data-testid="landing-mobile-toggle"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close mobile navigation"
            className="absolute inset-0 bg-black/55"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[min(88vw,360px)] overflow-auto border-l border-white/10 bg-[#081325] p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Menu</span>
              <button
                type="button"
                className="rounded-md p-2 text-white"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <MenuIcon open={true} />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-white/80"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="#apply-otp"
                className="mt-2 inline-flex justify-center rounded-full bg-blue-600 px-5 py-3 font-medium text-white"
                onClick={() => setOpen(false)}
              >
                Apply Now
              </a>
              <a
                href="https://boreal.insure"
                rel="noopener noreferrer"
                className="mt-2 inline-flex justify-center rounded-full border border-white px-5 py-3 font-medium text-white"
                onClick={() => setOpen(false)}
                data-testid="landing-mobile-link-boreal-insurance"
              >
                Visit Boreal Risk Management
              </a>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
