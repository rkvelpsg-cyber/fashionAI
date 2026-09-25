import Link from "next/link";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { preload } from "react-dom";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export default function Home() {
  preload("/homepage.jpg", { as: "image", fetchPriority: "high" });

  return (
    <main
      className="relative flex min-h-screen items-end justify-center overflow-hidden bg-black px-4 pb-12 pt-10 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/homepage.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,5,0.06)_0%,rgba(8,7,5,0.13)_32%,rgba(8,7,5,0.46)_100%)]" />

      <div className="hero-content relative z-10 mx-auto flex w-[min(92vw,850px)] flex-col items-center justify-center text-center text-white">
        <div className="hero-eyebrow mb-5 text-center text-[0.62rem] font-medium uppercase tracking-[0.38em] text-[#D6B36A] sm:text-[0.7rem]">
          AI-POWERED VIRTUAL EXPERIENCE
        </div>

        <div className="hero-heading">
          <h1
            className={`${cormorant.className} text-[clamp(3rem,6vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#F8F1E6]`}
          >
            <span className="block text-[#F8F1E6]">Lotus AI</span>
            <span className="block text-[#D6B36A]">Saree Mirror</span>
          </h1>
        </div>

        <div className="hero-subheading mt-4 sm:mt-5">
          <p
            className={`${inter.className} text-[clamp(1.2rem,2vw,2rem)] font-medium tracking-[-0.02em] text-[#F8F1E6]`}
          >
            Discover Your Perfect Saree Look
          </p>
        </div>

        <div className="hero-copy mt-4 max-w-[38rem]">
          <p
            className={`${inter.className} text-[clamp(0.9rem,1.2vw,1.15rem)] leading-7 text-white/78`}
          >
            Experience sarees virtually before you try them.
          </p>
        </div>

        <div className="hero-cta mt-8 sm:mt-9">
          <Link
            href="/kiosk"
            className={`${inter.className} inline-flex items-center justify-center gap-3 rounded-full bg-[#D6B36A] px-8 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#1a120d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 sm:px-9 sm:py-4 sm:text-[0.8rem]`}
          >
            START EXPERIENCE
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p
          className={`${inter.className} hero-note mt-4 text-[0.72rem] uppercase tracking-[0.24em] text-white/72`}
        >
          Touch to Begin
        </p>
      </div>
    </main>
  );
}
