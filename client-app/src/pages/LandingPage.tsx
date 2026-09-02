import PhoneOTPInline from "@/components/PhoneOTPInline";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";

// BF_CLIENT_BRAND_v167 - copy and palette aligned with BF-Website. The previous
// headline carried the boutique-advisory positioning the website rebuild
// removed, and read as a different company to anyone arriving from an ad.
const REASSURANCE = [
  "About five minutes to start",
  "No cost, and no obligation",
  "We never pull your credit",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-boreal-inkDeep font-sans text-white">
      <LandingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[.14em] text-boreal-gold">
              Start your application
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.12] md:text-5xl">
              One application. Every lender that fits.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
              Tell us about your business once and we take your file to the
              lenders who fund companies like yours. Enter your mobile number to
              begin or to pick up where you left off.
            </p>
          </div>

          <div
            id="apply-otp"
            className="mx-auto mt-10 max-w-md scroll-mt-24 rounded-2xl bg-white p-1 text-slate-900 shadow-2xl"
          >
            <PhoneOTPInline />
          </div>

          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-white/70">
            {REASSURANCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
