// BF_CLIENT_BLOCK_v323_MOBILE_FIRST_LAUNCH_v1 — mobile-first header
// with a hamburger button below md breakpoint and a full-screen
// slide-in menu. Pre-fix the bf-client header crammed three links
// (Products / Industries / Credit Readiness) up against the logo
// with no breathing room and no hamburger (screenshot 11.27.07).
// Touch targets are 44x44px minimum (iOS HIG). Menu items use the
// thumb zone (lower 2/3 of viewport).
import { useState } from "react";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/products", label: "Products" },
  { href: "/industries", label: "Industries" },
  { href: "/credit-readiness", label: "Credit Readiness" },
];

export default function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative w-full bg-[#020817] text-white">
      <div className="flex h-14 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <img
            src="/images/header_white_transparent.png"
            alt="Boreal Financial"
            className="h-8 w-auto"
          />
          <span className="hidden text-base font-semibold sm:inline">Boreal Financial</span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-white/80 hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" strokeLinecap="round" />
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="3" y1="17" x2="21" y2="17" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-[70] border-t border-white/10 bg-[#020817] md:hidden">
          <nav className="flex flex-col py-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-6 py-4 text-base text-white/90 hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
