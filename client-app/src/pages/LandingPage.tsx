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

          <section className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: "📄",
                title: "Streamlined Application",
                body: "Complete your business loan application in minutes with our intuitive, multi-step process.",
              },
              {
                icon: "💰",
                title: "Competitive Rates",
                body: "Access competitive financing options tailored to your business needs and industry.",
              },
              {
                icon: "🛡️",
                title: "Secure & Compliant",
                body: "Bank-level security with full compliance to financial regulations and data protection.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <div className="text-3xl">{c.icon}</div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {c.body}
                </p>
              </div>
            ))}
          </section>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
