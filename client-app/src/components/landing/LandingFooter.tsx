// BF_CLIENT_LANDING_FOOTER_WEBSITE_PARITY_v1
// Mirrors the BF-Website footer: dark (#0a1120) background, brand column with
// logo + tagline, Explore column, Apply column, and the bottom Privacy / Terms
// / copyright row. Website pages live on boreal.financial (different origin) so
// those links are absolute; Apply Now scrolls to this page's OTP form.
import logoUrl from "@/assets/logo-boreal-mountains-white.svg";

export default function LandingFooter() {
  return (
    <footer className="bg-[#0a1120] border-t border-[#1c2538] text-white/80 px-6 py-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid gap-8 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img src={logoUrl} alt="" className="h-8 w-auto" />
              <span className="font-semibold text-white">Boreal Financial</span>
            </div>
            <p className="text-sm leading-relaxed text-white/65">
              Structured lending marketplace helping businesses across Canada and the United States.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Explore</div>
            <ul className="list-none p-0 m-0 text-sm leading-loose">
              <li><a href="https://www.boreal.financial/how-it-works" className="text-white/75 no-underline hover:text-white">How It Works</a></li>
              <li><a href="https://www.boreal.financial/products" className="text-white/75 no-underline hover:text-white">Products</a></li>
              <li><a href="https://www.boreal.financial/industries" className="text-white/75 no-underline hover:text-white">Industries</a></li>
              <li><a href="https://www.boreal.insure/" rel="noopener noreferrer" className="text-white/75 no-underline hover:text-white" data-testid="landing-footer-link-boreal-insurance">Boreal Risk Management</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-3">Apply Now</div>
            <a href="#apply-otp" data-testid="landing-footer-apply" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium no-underline mb-3">
              Apply Now
            </a>
            <a href="https://www.boreal.financial/credit-readiness" className="block text-white/75 no-underline text-sm mb-2 hover:text-white">Check your Credit Readiness</a>
            <a href="https://www.boreal.financial/contact" className="block text-white/75 no-underline text-sm mb-2 hover:text-white">Contact Us</a>
            <a href="https://www.boreal.financial/product-comparison" className="block text-white/75 no-underline text-sm hover:text-white">Product Comparison</a>
          </div>
        </div>
        <div className="border-t border-[#1c2538] pt-4 flex justify-between text-xs text-white/55">
          <div className="flex gap-4">
            <a href="https://www.boreal.financial/privacy" className="text-inherit no-underline hover:text-white">Privacy Policy</a>
            <a href="https://www.boreal.financial/terms" className="text-inherit no-underline hover:text-white">Terms of Service</a>
          </div>
          <div>© {new Date().getFullYear()} Boreal Financial</div>
        </div>
      </div>
    </footer>
  );
}
