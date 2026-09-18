"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { demoProducts } from "@/lib/products";
import type { Product } from "@/lib/types";

type Step =
  | "welcome"
  | "consent"
  | "camera"
  | "review"
  | "category"
  | "products"
  | "generating"
  | "error"
  | "result";
type Category = "all" | Product["garmentType"];

const categoryOptions: Array<{ id: Category; label: string; summary: string }> =
  [
    { id: "all", label: "All Looks", summary: "Curated wardrobe" },
    { id: "saree", label: "SAREES", summary: "Explore our saree collection" },
    { id: "kurti", label: "KURTIS", summary: "Refined everyday silhouettes" },
    { id: "dress", label: "DRESSES", summary: "Statement-ready looks" },
    { id: "lehenga", label: "LEHENGAS", summary: "Occasion elegance" },
    { id: "shirt", label: "SHIRTS", summary: "Tailored layering" },
    { id: "tshirt", label: "T-SHIRTS", summary: "Premium casual staples" },
    { id: "top", label: "TOPS", summary: "Elevated essentials" },
    { id: "bottom", label: "BOTTOMS", summary: "Polished layers" },
  ];

export default function Kiosk() {
  const [step, setStep] = useState<Step>("welcome");
  const [originalCustomerImage, setOriginalCustomerImage] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState("GET READY");
  const [previewGeneratedImage, setPreviewGeneratedImage] = useState("");
  const [finalGeneratedImage, setFinalGeneratedImage] = useState("");
  const [generationError, setGenerationError] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const visibleProducts = useMemo(
    () =>
      selectedCategory === "all"
        ? demoProducts
        : demoProducts.filter(
            (product) => product.garmentType === selectedCategory,
          ),
    [selectedCategory],
  );

  useEffect(() => {
    if (step !== "camera") return;

    let stream: MediaStream | null = null;
    let active = true;

    const startCamera = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      )
        return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active || !video.current) return;

        video.current.srcObject = stream;
        void video.current.play().catch(() => undefined);
      } catch {
        if (active) {
          setStep("review");
        }
      }
    };

    void startCamera();

    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
      cancelCountdown();
    };
  }, [step]);

  function cancelCountdown() {
    if (countdownTimer.current) {
      clearTimeout(countdownTimer.current);
      countdownTimer.current = null;
    }
    if (speechFallbackTimer.current) {
      clearTimeout(speechFallbackTimer.current);
      speechFallbackTimer.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCountdownActive(false);
    setCountdownValue("GET READY");
  }

  function capture() {
    if (!video.current || !canvas.current) return;

    const videoElement = video.current;
    const canvasElement = canvas.current;
    const context = canvasElement.getContext("2d");

    if (!context) return;

    canvasElement.width = videoElement.videoWidth || 1080;
    canvasElement.height = videoElement.videoHeight || 1920;
    context.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height,
    );

    setCapturedImage(canvasElement.toDataURL("image/jpeg", 0.92));
    cancelCountdown();
    setStep("review");
  }

  function speak(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.volume = 1;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }

  function startCountdown() {
    if (countdownActive) return;

    cancelCountdown();
    setCountdownActive(true);
    setCountdownValue("GET READY");
    speak("Get ready");

    countdownTimer.current = setTimeout(() => {
      let count = 1;

      const announceNext = () => {
        if (count > 3) return;

        const current = count;
        setCountdownValue(String(current));
        const word = ["One", "Two", "Three"][current - 1];

        if (current === 3) {
          speak(word, () => {
            setCountdownValue("SMILE!");
            speechFallbackTimer.current = setTimeout(capture, 350);
          });
          speechFallbackTimer.current = setTimeout(() => {
            setCountdownValue("SMILE!");
            capture();
          }, 1400);
        } else {
          speak(word);
          count += 1;
          countdownTimer.current = setTimeout(announceNext, 1000);
        }
      };

      announceNext();
    }, 900);
  }

  async function tryOn(
    product: Product,
    mode: "performance" | "quality" = "performance",
  ) {
    setSelected(product);
    setGenerationError(false);
    setStep("generating");

    try {
      const garmentImage =
        product.garmentType === "saree"
          ? (product.drapedReferenceImage ??
            product.sareeMainImage ??
            product.garmentImage)
          : product.garmentImage;
      const response = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerImage: originalCustomerImage,
          garmentType: product.garmentType,
          garmentImage: new URL(garmentImage, location.origin).href,
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          mode: mode === "performance" ? "preview" : "quality",
          saree:
            product.garmentType === "saree"
              ? {
                  sareeType: product.sareeType,
                  drapeStyle: product.drapeStyle ?? "standard-nivi",
                  sareeMainImage: product.sareeMainImage,
                  drapedReferenceImage: product.drapedReferenceImage,
                  palluImage: product.palluImage,
                  borderImage: product.borderImage,
                  blouseImage: product.blouseImage,
                }
              : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error("Generation failed");

      if (mode === "quality") {
        setFinalGeneratedImage(data.imageUrl);
      } else {
        setPreviewGeneratedImage(data.imageUrl);
      }
      setStep("result");
    } catch {
      setGenerationError(true);
      setStep("error");
    }
  }

  function resetToWelcome() {
    cancelCountdown();
    setOriginalCustomerImage("");
    setCapturedImage("");
    setPreviewGeneratedImage("");
    setFinalGeneratedImage("");
    setSelected(null);
    setGenerationError(false);
    setSelectedCategory("all");
    setStep("welcome");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0d] text-white selection:bg-[#d9c7a5] selection:text-[#121212]">
      {step === "welcome" && (
        <section className="relative min-h-screen overflow-hidden bg-[#111111]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(166,128,84,0.34),_transparent_46%),linear-gradient(160deg,#171717_0%,#0d0d0d_50%,#070707_100%)]" />
          <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-10">
              <p className="text-center text-[0.68rem] font-medium uppercase tracking-[0.55em] text-[#d4c1a0] sm:text-xs">
                Lotus Prime Digital Solutions
              </p>
              <h1 className="mt-6 text-center text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-7xl">
                AI Fashion Mirror
              </h1>
              <p className="mt-5 text-center text-base leading-7 text-white/70 sm:text-xl">
                See yourself in your next look with elevated, private styling.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-[#d4c1a0]/30 bg-[#d4c1a0]/10 p-4 text-center text-sm text-[#f1dfbd] sm:text-base">
                Premium showroom experience • Portrait-first fitting session
              </div>

              <button
                onClick={() => setStep("consent")}
                className="mt-8 flex h-16 w-full items-center justify-center rounded-full bg-[#f2efe9] px-6 text-base font-semibold uppercase tracking-[0.18em] text-[#121212] shadow-[0_18px_40px_rgba(242,239,233,0.2)] transition-all duration-300 hover:scale-[1.01] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d4c1a0] active:scale-[0.99]"
              >
                Touch to Try
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "consent" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1b1b1b_0%,#0d0d0d_38%,#050505_100%)] p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#d4c1a0]">
              Privacy & styling
            </p>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
              AI Virtual Try-On
            </h2>
            <p className="mt-6 text-base leading-8 text-white/75 sm:text-xl">
              Your photo will be processed for a temporary virtual outfit
              preview. It is not permanently stored in this demo experience.
            </p>

            <div className="mt-8 space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-5 text-sm text-white/72 sm:text-base">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d4c1a0] text-xs font-bold text-[#111111]">
                  1
                </span>
                <span>
                  Position your full body in frame using the on-screen guide.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d4c1a0] text-xs font-bold text-[#111111]">
                  2
                </span>
                <span>
                  Review the snapshot and confirm it before selecting your look.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d4c1a0] text-xs font-bold text-[#111111]">
                  3
                </span>
                <span>Generate a premium styling preview in seconds.</span>
              </div>
            </div>

            <button
              onClick={() => setStep("camera")}
              className="mt-8 flex h-16 w-full items-center justify-center rounded-full bg-[#f2efe9] px-6 text-base font-semibold uppercase tracking-[0.18em] text-[#121212] shadow-[0_18px_40px_rgba(242,239,233,0.2)] transition-all duration-300 hover:scale-[1.01] hover:bg-white active:scale-[0.99]"
            >
              I agree & continue
            </button>
          </div>
        </section>
      )}

      {step === "camera" && (
        <section className="relative min-h-screen overflow-hidden bg-[#090909] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="absolute inset-0 bg-black lg:relative lg:min-h-screen">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain object-center"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_56%,rgba(0,0,0,0.52)_100%)] lg:relative lg:col-start-2 lg:row-start-1 lg:bg-none" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-[84vh] max-h-[900px] w-[36vw] min-w-[240px] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-between text-white/90 lg:left-[calc(50%_-_210px)]">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em]">
              Head
            </span>
            <div className="relative flex flex-1 w-full items-center justify-center">
              <div className="absolute top-[4%] h-[9%] aspect-square rounded-full border-2 border-[#f3efe9]/85" />
              <div className="absolute top-[14%] h-[48%] w-[30%] rounded-[48%_48%_35%_35%] border-2 border-[#f3efe9]/75" />
              <div className="absolute top-[19%] h-2 w-[72%] rotate-[-10deg] rounded-full bg-[#f3efe9]/75" />
              <div className="absolute top-[19%] h-2 w-[72%] rotate-[10deg] rounded-full bg-[#f3efe9]/75" />
              <div className="absolute top-[58%] left-[39%] h-[31%] w-2 rotate-[9deg] rounded-full bg-[#f3efe9]/75" />
              <div className="absolute top-[58%] left-[61%] h-[31%] w-2 rotate-[-9deg] rounded-full bg-[#f3efe9]/75" />
              <div className="absolute bottom-[4%] left-[30%] h-2 w-[18%] rotate-[8deg] rounded-full bg-[#f3efe9]/75" />
              <div className="absolute bottom-[4%] right-[30%] h-2 w-[18%] rotate-[-8deg] rounded-full bg-[#f3efe9]/75" />
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em]">
              Feet
            </span>
          </div>

          {countdownActive && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/20">
              <p
                key={countdownValue}
                className="animate-pulse text-center text-7xl font-semibold uppercase tracking-[0.08em] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.65)] sm:text-9xl"
              >
                {countdownValue}
              </p>
            </div>
          )}

          <aside className="absolute inset-x-0 bottom-0 z-20 bg-black/80 px-5 pb-5 pt-6 text-center backdrop-blur-sm lg:relative lg:col-start-2 lg:row-start-1 lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:bg-[#111111] lg:px-8 lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d4c1a0]">
              Camera setup
            </p>
            <h2 className="mt-3 text-2xl font-semibold uppercase tracking-[0.08em] text-white sm:text-3xl">
              Position your full body inside the guide
            </h2>
            <p className="mt-3 text-base text-white/75">
              Move closer until your body fits the outline.
            </p>
            <div className="mt-5 space-y-2 text-sm leading-6 text-white/70">
              <p>• Stand approximately 2–3 metres from the screen</p>
              <p>• Stand facing the camera</p>
              <p>• Keep your full body inside the guide</p>
              <p>• Keep your arms slightly away from your body</p>
              <p>• Stand straight and keep your feet visible</p>
            </div>
            <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-[#f1dfbd]">
              Too close? Step back slightly.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/55">
              Aim for a small margin above your head and below your feet.
            </p>
            <button
              onClick={startCountdown}
              disabled={countdownActive}
              className="mt-6 flex min-h-16 w-full items-center justify-center rounded-full bg-[#f2efe9] px-6 py-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#121212] shadow-[0_18px_40px_rgba(242,239,233,0.2)] transition-all duration-300 hover:bg-white active:scale-[0.99]"
              aria-label="I'm ready for automatic photo capture"
            >
              {countdownActive ? "Get ready..." : "I'm ready"}
            </button>
            <p className="mt-3 text-xs text-white/55">
              {countdownActive
                ? "One · Two · Three"
                : "3-second automatic photo"}
            </p>
          </aside>

          <canvas ref={canvas} className="hidden" />
        </section>
      )}

      {step === "review" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-5 sm:p-8">
          <div className="w-full max-w-3xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[#d4c1a0]">
                  Check your photo
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Make sure the complete photo is visible
                </h2>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6">
              <div className="overflow-hidden rounded-[1.5rem] bg-black/30">
                <img
                  src={capturedImage}
                  alt="Customer preview"
                  className="mx-auto max-h-[68vh] w-full object-contain"
                />
              </div>

              <div className="mt-5 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
                <p>✓ Face visible</p>
                <p>✓ Full body visible</p>
                <p>✓ Feet visible</p>
                <p>✓ Standing position recommended</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    cancelCountdown();
                    setCapturedImage("");
                    setStep("camera");
                  }}
                  className="flex h-16 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:border-white/30 hover:bg-white/5 active:scale-[0.99]"
                >
                  Retake
                </button>
                <button
                  onClick={() => {
                    setOriginalCustomerImage(capturedImage);
                    setStep("category");
                  }}
                  className="flex h-16 items-center justify-center rounded-full bg-[#f2efe9] px-5 text-base font-semibold uppercase tracking-[0.12em] text-[#121212] transition-all duration-300 hover:bg-white active:scale-[0.99]"
                >
                  Use this photo
                </button>
              </div>
              <p className="mt-5 text-center text-sm leading-6 text-white/60">
                For the best saree result, make sure your full body from head to
                feet is visible.
              </p>
            </div>
          </div>
        </section>
      )}

      {step === "category" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-5 sm:p-8">
          <div className="w-full max-w-4xl">
            <div className="mb-6">
              <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[#d4c1a0]">
                Category
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Choose your look
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setStep("products");
                  }}
                  className="group min-h-[180px] rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-left shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4c1a0]/50 hover:bg-white/8 active:scale-[0.99]"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#d4c1a0]/15 text-lg text-[#f5ead0]">
                    {category.label.charAt(0)}
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {category.label}
                  </p>
                  <p className="mt-2 text-sm text-white/60">
                    {category.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "products" && (
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-5 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[#d4c1a0]">
                  Products
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                  Shop the edit
                </h2>
              </div>

              <button
                onClick={() => setStep("category")}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-transparent px-6 text-sm font-medium uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white/5"
              >
                Change category
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#171717] shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4c1a0]/50"
                >
                  <div className="overflow-hidden bg-black/20">
                    <img
                      src={
                        product.thumbnail ||
                        product.sareeMainImage ||
                        product.garmentImage ||
                        "/demo/dress.svg"
                      }
                      alt={product.name}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          {product.garmentType === "saree"
                            ? (product.sareeType ?? "Saree")
                            : product.garmentType}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                          {product.name}
                        </h3>
                      </div>
                      <p className="whitespace-nowrap text-lg font-semibold text-[#f5ead0]">
                        ₹{product.price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <button
                      onClick={() => tryOn(product)}
                      className="flex h-14 w-full items-center justify-center rounded-full bg-[#f2efe9] px-5 text-base font-semibold uppercase tracking-[0.12em] text-[#121212] transition-all duration-300 hover:bg-white active:scale-[0.99]"
                    >
                      Try it on
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "generating" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-6">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#d4c1a0]/50 bg-[#d4c1a0]/10 text-4xl text-[#f3dfba] shadow-[0_0_40px_rgba(212,193,160,0.24)] animate-pulse">
              ✦
            </div>
            <h2 className="mt-8 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {selected?.garmentType === "saree"
                ? "Creating Your Saree Look..."
                : "Creating your look..."}
            </h2>
            <p className="mt-4 text-base text-white/70 sm:text-xl">
              {selected?.garmentType === "saree"
                ? "AI is visualizing your selected saree while keeping your original photo as the reference."
                : "Applying your selected style."}
            </p>
          </div>
        </section>
      )}

      {step === "error" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-6">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-12">
            <p className="text-xs uppercase tracking-[0.35em] text-[#d4c1a0]">
              Try-on unavailable
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              We couldn&apos;t create this saree look.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              Please try again or choose another saree.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => selected && tryOn(selected)}
                className="flex h-14 items-center justify-center rounded-full bg-[#f2efe9] px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#121212]"
              >
                Try again
              </button>
              <button
                onClick={() => setStep("products")}
                className="flex h-14 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium uppercase tracking-[0.1em] text-white"
              >
                Choose another saree
              </button>
              <button
                onClick={resetToWelcome}
                className="flex h-14 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium uppercase tracking-[0.1em] text-white"
              >
                Start over
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "result" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1a1a_0%,#0f0f0f_38%,#070707_100%)] p-5 sm:p-8">
          <div className="w-full max-w-4xl">
            <div className="mb-6 text-center">
              <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[#d4c1a0]">
                Result
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                {selected?.garmentType === "saree"
                  ? "YOUR SAREE LOOK"
                  : "Your New Look"}
              </h2>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6">
              <div className="overflow-hidden rounded-[1.5rem] bg-black/30">
                <img
                  src={finalGeneratedImage || previewGeneratedImage}
                  alt="AI generated outfit preview"
                  className="mx-auto max-h-[62vh] w-full object-contain"
                />
              </div>

              <div className="mt-6 text-center">
                <h3 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
                  {selected?.name}
                </h3>
                <p className="mt-2 text-base text-white/65 sm:text-lg">
                  AI-generated visualization. Actual drape, fit, colour and
                  appearance may vary.
                </p>
              </div>

              {selected && (
                <dl className="mt-7 grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-left sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-white/45">
                      SKU
                    </dt>
                    <dd className="mt-1 text-white">{selected.sku}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Saree type
                    </dt>
                    <dd className="mt-1 text-white">
                      {selected.sareeType ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Fabric
                    </dt>
                    <dd className="mt-1 text-white">
                      {selected.fabric ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Colour
                    </dt>
                    <dd className="mt-1 text-white">{selected.colour}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Price
                    </dt>
                    <dd className="mt-1 text-white">
                      ₹{selected.price.toLocaleString("en-IN")}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => setStep("products")}
                  className="flex h-16 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/5 active:scale-[0.99]"
                >
                  Try another saree
                </button>
                <button
                  onClick={() => undefined}
                  className="flex h-16 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/5 active:scale-[0.99]"
                >
                  Save look
                </button>
                <button
                  onClick={() => undefined}
                  className="flex h-16 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/5 active:scale-[0.99]"
                >
                  Compare looks
                </button>
                {selected && (
                  <button
                    onClick={() => tryOn(selected, "quality")}
                    className="flex h-16 items-center justify-center rounded-full bg-[#f2efe9] px-5 text-base font-semibold uppercase tracking-[0.12em] text-[#121212] transition-all duration-300 hover:bg-white active:scale-[0.99]"
                  >
                    Create final image
                  </button>
                )}
                <button
                  onClick={resetToWelcome}
                  className="flex h-16 items-center justify-center rounded-full border border-white/15 bg-transparent px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/5 active:scale-[0.99]"
                >
                  Finish
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
