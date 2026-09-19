"use client";

import { useEffect, useRef, useState } from "react";
import { getAvailableCatalogueProducts } from "@/lib/fashion-catalogue";
import type { Product } from "@/lib/types";

type Step =
  | "welcome"
  | "consent"
  | "camera"
  | "review"
  | "catalogue"
  | "generating"
  | "result"
  | "error";

export default function Kiosk() {
  const [step, setStep] = useState<Step>("welcome");
  const [originalCustomerImage, setOriginalCustomerImage] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [previewGeneratedImage, setPreviewGeneratedImage] = useState("");
  const [selectedSaree, setSelectedSaree] = useState<Product | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState("GET READY");
  const [videoError, setVideoError] = useState(false);
  const [aiTestLimitReached, setAiTestLimitReached] = useState(false);

  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationInFlight = useRef(false);
  const availableSarees = getAvailableCatalogueProducts();

  useEffect(() => {
    if (step !== "camera") return;

    let stream: MediaStream | null = null;
    let active = true;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return;
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
        if (active) setStep("review");
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
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
    countdownTimer.current = null;
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

  function startCountdown() {
    if (countdownActive) return;
    setCountdownActive(true);
    setCountdownValue("GET READY");
    let count = 3;
    const tick = () => {
      if (count === 0) {
        setCountdownValue("SMILE!");
        countdownTimer.current = setTimeout(capture, 600);
        return;
      }
      setCountdownValue(String(count));
      count -= 1;
      countdownTimer.current = setTimeout(tick, 900);
    };
    countdownTimer.current = setTimeout(tick, 700);
  }

  function getSessionId() {
    const key = "lotus-ai-test-session";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const value =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, value);
    return value;
  }

  async function requestSareeTryOn(product: Product) {
    const garmentImage =
      product.drapedReferenceImage ??
      product.sareeMainImage ??
      product.garmentImage;
    const response = await fetch("/api/tryon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ai-session-id": getSessionId(),
      },
      body: JSON.stringify({
        customerImage: originalCustomerImage,
        garmentType: "saree",
        garmentImage: new URL(garmentImage, window.location.origin).href,
        garmentSource: product.drapedReferenceImage
          ? "saree.drapedReferenceImage"
          : product.sareeMainImage
            ? "saree.sareeMainImage"
            : "product.garmentImage",
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        mode: "quality",
        saree: {
          sareeType: product.sareeType,
          drapeStyle: product.drapeStyle ?? "standard-nivi",
          sareeMainImage: product.sareeMainImage,
          drapedReferenceImage: product.drapedReferenceImage,
          palluImage: product.palluImage,
          borderImage: product.borderImage,
          blouseImage: product.blouseImage,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      if (data.code === "AI_TEST_LIMIT_REACHED")
        throw new Error("AI_TEST_LIMIT_REACHED");
      throw new Error("Generation failed");
    }
    return data.imageUrl as string;
  }

  async function tryOnSaree(product: Product) {
    if (generationInFlight.current || !originalCustomerImage) return;
    generationInFlight.current = true;
    setSelectedSaree(product);
    setAiTestLimitReached(false);
    setStep("generating");
    try {
      setPreviewGeneratedImage(await requestSareeTryOn(product));
      setStep("result");
    } catch (error) {
      setAiTestLimitReached(
        error instanceof Error && error.message === "AI_TEST_LIMIT_REACHED",
      );
      setStep("error");
    } finally {
      generationInFlight.current = false;
    }
  }

  function resetToWelcome() {
    cancelCountdown();
    setOriginalCustomerImage("");
    setCapturedImage("");
    setPreviewGeneratedImage("");
    setSelectedSaree(null);
    setAiTestLimitReached(false);
    window.sessionStorage.removeItem("lotus-ai-test-session");
    setStep("welcome");
  }

  const productImage = (product: Product) =>
    product.thumbnail ||
    product.sareeMainImage ||
    product.garmentImage ||
    "/demo/dress.svg";

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#0d0d0d] text-white">
      {step === "welcome" && (
        <section
          className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#0d0d0d]"
          onClick={() => setStep("consent")}
        >
          <div className="absolute inset-0">
            {!videoError ? (
              <video
                className="h-full w-full object-cover"
                src="/promo_pexel.mp4"
                autoPlay
                loop
                muted
                playsInline
                onError={() => setVideoError(true)}
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_80%_10%,rgba(223,190,112,0.2),transparent_24%),linear-gradient(135deg,#1b120f_0%,#090909_32%,#120d09_100%)]" />
            )}
            <div className="absolute inset-0 bg-black/55" />
          </div>
          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-8 sm:py-12 lg:px-20">
            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-[#d7c29e] sm:text-xs sm:tracking-[0.55em]">
              LOTUS PRIME DIGITAL SOLUTIONS
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3.25rem,14vw,8rem)] leading-[0.84] tracking-[-0.04em] text-[#f6f1e8] sm:mt-6">
              AI SAREE<span className="block italic">MIRROR</span>
            </h1>
            <p className="mt-7 text-[clamp(1.25rem,4vw,2rem)] text-[#f2efe9]">
              Discover your next saree look.
            </p>
            <p className="mt-3 text-base text-white/75 sm:text-lg">
              Try beautiful sarees instantly with AI.
            </p>
            <button className="mt-8 min-h-14 rounded-full bg-[#f3ead9] px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#111111] sm:px-8 sm:py-5 sm:text-sm sm:tracking-[0.28em]">
              TOUCH TO TRY
            </button>
          </div>
        </section>
      )}

      {step === "consent" && (
        <section className="flex min-h-[100svh] items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2rem] sm:p-12">
            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d4c1a0] sm:text-xs sm:tracking-[0.5em]">
              Privacy & styling
            </p>
            <h2 className="mt-5 text-[clamp(2rem,7vw,3rem)] font-semibold leading-tight sm:mt-6">
              AI SAREE VIRTUAL TRY-ON
            </h2>
            <p className="mt-5 text-base leading-7 text-white/75 sm:mt-6 sm:text-lg sm:leading-8">
              Your photo is used for a temporary saree preview and is not
              permanently stored in this demo.
            </p>
            <button
              onClick={() => setStep("camera")}
              className="mt-7 flex min-h-14 w-full items-center justify-center rounded-full bg-[#f2efe9] px-5 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#121212] sm:mt-8 sm:min-h-16 sm:px-6 sm:text-base sm:tracking-[0.18em]"
            >
              I AGREE & CONTINUE
            </button>
          </div>
        </section>
      )}

      {step === "camera" && (
        <section className="relative min-h-[100svh] overflow-hidden bg-[#090909] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="absolute inset-0 min-h-[58svh] bg-black lg:relative lg:min-h-[100svh]">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />
          </div>
          {countdownActive && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/20">
              <p className="text-[clamp(4rem,18vw,9rem)] font-semibold text-white">
                {countdownValue}
              </p>
            </div>
          )}
          <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[46svh] overflow-y-auto bg-black/85 p-4 text-center sm:p-6 lg:relative lg:flex lg:min-h-[100svh] lg:max-h-none lg:flex-col lg:justify-center lg:bg-[#111111] lg:text-left">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#d4c1a0] sm:text-xs sm:tracking-[0.28em]">
              Camera setup
            </p>
            <h2 className="mt-3 text-[clamp(1.5rem,5vw,2.25rem)] font-semibold leading-tight">
              Position your full body inside the guide
            </h2>
            <p className="mt-3 text-white/70">
              Keep your face and feet visible.
            </p>
            <button
              onClick={startCountdown}
              disabled={countdownActive}
              className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-[#f2efe9] px-5 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#121212] sm:min-h-16 sm:px-6 sm:tracking-[0.13em]"
            >
              {countdownActive ? "GET READY..." : "I'M READY"}
            </button>
          </aside>
          <canvas ref={canvas} className="hidden" />
        </section>
      )}

      {step === "review" && (
        <section className="flex min-h-[100svh] items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-3xl">
            <p className="text-xs uppercase tracking-[0.42em] text-[#d4c1a0]">
              Check your photo
            </p>
            <h2 className="mt-3 text-[clamp(1.75rem,6vw,2.25rem)] font-semibold leading-tight">
              Make sure your complete photo is visible
            </h2>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-3 sm:mt-7 sm:rounded-[2rem] sm:p-5">
              <img
                src={capturedImage}
                alt="Customer preview"
                className="mx-auto max-h-[55svh] w-full object-contain sm:max-h-[68svh]"
              />
              <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setCapturedImage("");
                    setStep("camera");
                  }}
                  className="min-h-14 rounded-full border border-white/15 px-5 py-3 text-sm uppercase tracking-[0.1em] sm:min-h-16 sm:tracking-[0.12em]"
                >
                  RETAKE
                </button>
                <button
                  onClick={() => {
                    setOriginalCustomerImage(capturedImage);
                    setStep("catalogue");
                  }}
                  className="min-h-14 rounded-full bg-[#f2efe9] px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[#121212] sm:min-h-16 sm:tracking-[0.12em]"
                >
                  USE THIS PHOTO
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === "catalogue" && (
        <section className="min-h-[100svh] p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[0.42em] text-[#d4c1a0]">
              Saree collection
            </p>
            <h2 className="mt-3 text-[clamp(2.25rem,7vw,3rem)] font-semibold leading-tight">
              SAREE CATALOGUE
            </h2>
            <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {availableSarees.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#171717] sm:rounded-[1.75rem]"
                >
                  <img
                    src={productImage(product)}
                    alt={product.name}
                    className="aspect-[4/5] w-full object-contain p-2 sm:p-3"
                  />
                  <div className="space-y-4 p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#d4c1a0]">
                      {product.sareeType ?? "Saree"}
                    </p>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-lg font-semibold leading-tight sm:text-xl">
                        {product.name}
                      </h3>
                      <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#f5ead0] sm:text-base">
                        ₹{product.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/65">
                      <span>Colour: {product.colour}</span>
                      <span>Fabric: {product.fabric ?? "-"}</span>
                    </div>
                    <button
                      onClick={() => void tryOnSaree(product)}
                      disabled={
                        !product.isTryOnReady || generationInFlight.current
                      }
                      className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#f2efe9] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#121212] disabled:opacity-50 sm:text-sm sm:tracking-[0.12em]"
                    >
                      {product.isTryOnReady ? "TRY IT ON" : "COMING SOON"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "generating" && (
        <section className="flex min-h-[100svh] items-center justify-center p-4 text-center sm:p-6">
          <div>
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full border border-[#d4c1a0]/50 bg-[#d4c1a0]/10" />
            <h2 className="mt-7 text-[clamp(2rem,7vw,3rem)] font-semibold leading-tight">
              CREATING YOUR SAREE LOOK...
            </h2>
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              AI is visualizing your selected saree using your original photo.
            </p>
          </div>
        </section>
      )}
      {step === "error" && (
        <section className="flex min-h-[100svh] items-center justify-center p-4 text-center sm:p-6">
          <div className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:rounded-[2rem] sm:p-12">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-[#d4c1a0] sm:text-xs sm:tracking-[0.35em]">
              Saree try-on unavailable
            </p>
            <h2 className="mt-5 text-[clamp(1.9rem,7vw,2.5rem)] font-semibold leading-tight">
              {aiTestLimitReached
                ? "AI TEST LIMIT REACHED"
                : "We couldn't create this saree look."}
            </h2>
            <p className="mt-4 text-white/70">
              {aiTestLimitReached
                ? "Start a new test session to continue."
                : "Please try again or choose another saree."}
            </p>
            <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2">
              {!aiTestLimitReached && (
                <button
                  onClick={() => setStep("catalogue")}
                  className="min-h-14 rounded-full bg-[#f2efe9] px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#121212]"
                >
                  TRY ANOTHER SAREE
                </button>
              )}
              <button
                onClick={resetToWelcome}
                className="min-h-14 rounded-full border border-white/15 px-4 py-3 text-sm uppercase tracking-[0.08em]"
              >
                START OVER
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "result" && selectedSaree && (
        <section className="flex min-h-[100svh] items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-4xl">
            <div className="mb-6 text-center">
              <p className="text-xs uppercase tracking-[0.42em] text-[#d4c1a0]">
                Saree result
              </p>
              <h2 className="mt-3 text-[clamp(2.25rem,8vw,3rem)] font-semibold leading-tight">
                YOUR AI SAREE LOOK
              </h2>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-3 sm:rounded-[2rem] sm:p-5">
              <img
                src={previewGeneratedImage}
                alt="AI generated saree preview"
                className="mx-auto max-h-[58svh] w-full object-contain sm:max-h-[62svh]"
              />
              <div className="mt-6 text-center">
                <h3 className="text-xl font-semibold leading-tight sm:text-2xl">
                  {selectedSaree.name}
                </h3>
                <p className="mt-2 text-sm text-white/65 sm:text-base">
                  {selectedSaree.colour} · {selectedSaree.fabric ?? "-"} · ₹
                  {selectedSaree.price.toLocaleString("en-IN")}
                </p>
                <p className="mt-3 text-sm text-white/60">
                  AI-generated visualization. Actual drape, fit, colour and
                  appearance may vary.
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-3">
                <button
                  onClick={() => setStep("catalogue")}
                  className="min-h-14 rounded-full bg-[#f2efe9] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#121212] sm:min-h-16 sm:text-sm sm:tracking-[0.12em]"
                >
                  TRY ANOTHER SAREE
                </button>
                <a
                  href={previewGeneratedImage}
                  download="lotus-ai-saree-look.jpg"
                  className="flex min-h-14 items-center justify-center rounded-full border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.08em] sm:min-h-16 sm:text-sm sm:tracking-[0.12em]"
                >
                  DOWNLOAD
                </a>
                <button
                  onClick={resetToWelcome}
                  className="min-h-14 rounded-full border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.08em] sm:min-h-16 sm:text-sm sm:tracking-[0.12em]"
                >
                  START OVER
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
