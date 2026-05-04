import PhoneOTPInline from "@/components/PhoneOTPInline";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1320] text-white">
      <LandingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              Professional Business Financing Solutions
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/75 md:text-lg">
              Connecting Canadian and US businesses with tailored financing
              solutions. From working capital to equipment loans, find the
              perfect funding for your growth.
            </p>
          </div>

          <div
            id="apply-otp"
            className="mx-auto mt-10 max-w-md scroll-mt-24 rounded-2xl bg-white p-1 text-slate-900 shadow-2xl"
          >
            <PhoneOTPInline />
          </div>

          {/* BF_CLIENT_BLOCK_v104_MOBILE_POLISH_v1 — three-cards section removed per Todd mobile feedback. */}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
