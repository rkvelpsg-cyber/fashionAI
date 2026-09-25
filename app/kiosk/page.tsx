"use client";

import { Cormorant_Garamond, Inter } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { getAvailableCatalogueProducts } from "@/lib/fashion-catalogue";
import type { Product } from "@/lib/types";

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

type Step =
  | "welcome"
  | "consent"
  | "camera"
  | "review"
  | "catalogue"
  | "generating"
  | "result"
  | "error";

const loadingStatusMessages = [
  "Preparing your photo...",
  "Studying your selected saree...",
  "Draping your saree with AI...",
  "Refining the details...",
  "Creating your final look...",
];

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
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [downloadState, setDownloadState] = useState<
    "idle" | "preparing" | "ready" | "error"
  >("idle");

  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationInFlight = useRef(false);
  const availableSarees = getAvailableCatalogueProducts();

  function getPreferredVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const preferredNamePatterns = [
      "zira",
      "samantha",
      "kavya",
      "neha",
      "ria",
      "mei",
      "susan",
      "female",
    ];

    const localePatterns = ["en-IN", "hi-IN", "en-US", "en-GB"];

    const indiaFemaleVoice =
      voices.find(
        (voice) =>
          localePatterns.some((pattern) =>
            voice.lang.toLowerCase().includes(pattern.toLowerCase()),
          ) &&
          preferredNamePatterns.some((pattern) =>
            voice.name.toLowerCase().includes(pattern.toLowerCase()),
          ),
      ) ??
      voices.find(
        (voice) =>
          localePatterns.some((pattern) =>
            voice.lang.toLowerCase().includes(pattern.toLowerCase()),
          ) && /female/i.test(voice.name),
      ) ??
      voices.find((voice) => /en-in|hi-in/i.test(voice.lang)) ??
      voices.find((voice) => /female/i.test(voice.name)) ??
      voices[0];

    return indiaFemaleVoice ?? null;
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const availableVoices = synth.getVoices();

    if (!availableVoices.length) {
      const waitingForVoices = () => {
        const voice = getPreferredVoice();
        if (!voice) {
          window.setTimeout(waitingForVoices, 250);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.84;
        utterance.pitch = 1.18;
        utterance.volume = 0.92;
        synth.cancel();
        synth.speak(utterance);
      };

      waitingForVoices();
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredVoice = getPreferredVoice();

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else {
      utterance.lang = "en-IN";
    }

    utterance.rate = 0.84;
    utterance.pitch = 1.18;
    utterance.volume = 0.92;
    synth.speak(utterance);
  }

  useEffect(() => {
    if (step !== "consent") return;

    const timer = window.setTimeout(() => {
      speak(
        "Welcome to Lotus AI Fashion Mirror. Let us discover the saree that feels made for you.",
      );
    }, 500);

    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "generating") {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingMessageIndex(
        (currentIndex) => (currentIndex + 1) % loadingStatusMessages.length,
      );
    }, 3500);

    return () => window.clearInterval(interval);
  }, [step]);

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
    speak("Please hold your pose. In three, two, one, smile.");

    let count = 3;
    const tick = () => {
      if (count === 0) {
        setCountdownValue("SMILE!");
        speak("Smile for your portrait.");
        countdownTimer.current = setTimeout(capture, 600);
        return;
      }
      setCountdownValue(String(count));
      if (count > 0) {
        speak(String(count));
      }
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

  async function pngBlobFromImage(source: string) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
      image.src = source;
    });

    const canvasElement = document.createElement("canvas");
    canvasElement.width = image.naturalWidth;
    canvasElement.height = image.naturalHeight;
    const context = canvasElement.getContext("2d");
    if (!context || !canvasElement.width || !canvasElement.height) {
      throw new Error("IMAGE_CONVERSION_FAILED");
    }

    context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvasElement.toBlob(resolve, "image/png");
    });
    if (!pngBlob) throw new Error("PNG_ENCODING_FAILED");
    return pngBlob;
  }

  function downloadPng(blob: Blob) {
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const safeSku = selectedSaree?.sku.replace(/[^a-z0-9-]/gi, "-") ?? "look";
    downloadLink.href = objectUrl;
    downloadLink.download = `lotus-ai-saree-${safeSku}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  async function handlePngDownload() {
    if (!previewGeneratedImage || downloadState === "preparing") return;
    setDownloadState("preparing");

    try {
      let pngBlob: Blob;
      try {
        pngBlob = await pngBlobFromImage(previewGeneratedImage);
      } catch {
        const resultUrl = new URL(previewGeneratedImage, window.location.href);
        if (resultUrl.protocol !== "https:")
          throw new Error("PNG_DOWNLOAD_FAILED");
        pngBlob = await pngBlobFromImage(
          `/api/download-result?imageUrl=${encodeURIComponent(previewGeneratedImage)}`,
        );
      }

      downloadPng(pngBlob);
      setDownloadState("ready");
      window.setTimeout(() => setDownloadState("idle"), 2000);
    } catch {
      setDownloadState("error");
      window.setTimeout(() => setDownloadState("idle"), 3200);
    }
  }

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#0d0d0d] text-white">
      {step === "welcome" && (
        <section
          className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#0d0d0d]"
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
                preload="auto"
                onError={() => setVideoError(true)}
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_80%_10%,rgba(223,190,112,0.2),transparent_24%),linear-gradient(135deg,#1b120f_0%,#090909_32%,#120d09_100%)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,6,5,0.78)_0%,rgba(7,6,5,0.42)_35%,rgba(7,6,5,0.1)_65%,transparent_100%)]" />
          </div>

          <div className="welcome-copy absolute inset-x-0 bottom-[clamp(2rem,7vh,5.625rem)] z-10 mx-auto w-[min(92vw,850px)] px-4 text-center sm:px-6">
            <h1
              className={`${cormorant.className} welcome-item text-[clamp(3rem,5.5vw,6rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#f8f1e6]`}
            >
              <span className="block">Discover Yourself</span>
              <span className="block text-[#d6b36a]">in Every Saree</span>
            </h1>

            <p
              className={`${inter.className} welcome-item mx-auto mt-5 max-w-[37.5rem] text-[clamp(1rem,1.4vw,1.2rem)] leading-7 text-white/80`}
            >
              Experience beautiful sarees on yourself with our AI-powered
              virtual mirror.
            </p>

            <button
              type="button"
              onClick={() => setStep("consent")}
              className={`${inter.className} welcome-item mt-7 inline-flex items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-7 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#1a120d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 sm:px-9 sm:py-4 sm:text-[0.8rem]`}
            >
              BEGIN YOUR EXPERIENCE
              <span aria-hidden="true">→</span>
            </button>

            <p
              className={`${inter.className} welcome-item mt-4 text-[0.65rem] uppercase tracking-[0.24em] text-white/70`}
            >
              Touch to continue
            </p>
          </div>
        </section>
      )}

      {step === "consent" && (
        <section
          className="consent-screen relative flex min-h-[100svh] justify-center overflow-hidden"
          style={{
            backgroundImage: "url('/mainimage.jpg')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,6,5,0.82)_0%,rgba(7,6,5,0.5)_28%,rgba(7,6,5,0.16)_55%,rgba(7,6,5,0.04)_75%,transparent_100%)]" />

          <div className="consent-copy absolute inset-x-0 bottom-[clamp(1.875rem,6vh,5rem)] z-10 mx-auto w-[min(92vw,850px)] px-4 text-center sm:px-6">
            <p
              className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.36em] text-[#d6b36a] sm:text-[0.7rem]`}
            >
              Privacy &amp; Your Experience
            </p>

            <h2
              className={`${cormorant.className} mt-4 text-[clamp(2.8rem,5vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#f8f1e6]`}
            >
              <span className="block">Your Privacy,</span>
              <span className="block text-[#d6b36a]">
                Beautifully Respected
              </span>
            </h2>

            <p
              className={`${inter.className} mx-auto mt-5 max-w-[40.625rem] text-[clamp(0.95rem,1.4vw,1.15rem)] leading-7 text-white/80`}
            >
              Your photo is used only to create your virtual saree experience
              and is not permanently stored in this demo.
            </p>

            <button
              onClick={() => setStep("camera")}
              className={`${inter.className} mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-7 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#1a120d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 sm:min-h-16 sm:px-9 sm:text-[0.8rem]`}
            >
              I AGREE & CONTINUE
              <span aria-hidden="true">→</span>
            </button>

            <p
              className={`${inter.className} mt-4 text-[0.65rem] uppercase tracking-[0.24em] text-white/70`}
            >
              Continue to Camera
            </p>
          </div>
        </section>
      )}

      {step === "camera" && (
        <section className="camera-screen relative min-h-[100svh] overflow-hidden bg-[#090909] lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(20rem,25vw,26rem)]">
          <div className="camera-preview absolute inset-0 min-h-[58svh] bg-black lg:relative lg:min-h-[100svh]">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 sm:p-10">
              <div className="h-[min(74%,42rem)] w-[min(52%,20rem)] rounded-[999px] border border-[#d6b36a]/45 shadow-[0_0_0_1px_rgba(248,241,230,0.08),0_0_38px_rgba(214,179,106,0.12)]" />
            </div>
          </div>
          {countdownActive && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/20">
              <p className="text-[clamp(4rem,18vw,9rem)] font-semibold text-white">
                {countdownValue}
              </p>
            </div>
          )}
          <aside className="camera-panel absolute inset-x-0 bottom-0 z-20 max-h-[46svh] overflow-y-auto bg-[#0d0b09]/95 px-5 py-6 text-center sm:px-8 sm:py-8 lg:relative lg:flex lg:min-h-[100svh] lg:max-h-none lg:flex-col lg:justify-center">
            <div className="camera-panel-content mx-auto w-full max-w-[22rem]">
              <p
                className={`${inter.className} text-[0.58rem] font-medium uppercase tracking-[0.28em] text-[#d6b36a] sm:text-[0.66rem] sm:tracking-[0.32em]`}
              >
                Prepare for Your Saree Experience
              </p>

              <h2
                className={`${cormorant.className} mt-4 text-[clamp(2.8rem,4vw,5rem)] font-medium leading-[0.96] tracking-[-0.02em] text-[#f8f1e6]`}
              >
                <span className="block">Step Into</span>
                <span className="block text-[#d6b36a]">the Frame</span>
              </h2>

              <p
                className={`${inter.className} mx-auto mt-4 max-w-[20rem] text-[clamp(0.92rem,1.2vw,1.05rem)] leading-6 text-white/80`}
              >
                Stand naturally and make sure your
                <span className="font-medium text-white/90">
                  {" "}
                  face and full body
                </span>
                are clearly visible.
              </p>

              <p
                className={`${inter.className} mt-3 text-[0.78rem] leading-5 text-white/60`}
              >
                Keep your head and feet inside the camera view.
              </p>

              <button
                onClick={startCountdown}
                disabled={countdownActive}
                className={`${inter.className} mt-6 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-7 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#1a120d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-16 sm:px-9 sm:text-[0.8rem]`}
              >
                {countdownActive ? "GET READY..." : "I'M READY"}
                {!countdownActive && <span aria-hidden="true">→</span>}
              </button>

              <p
                className={`${inter.className} mt-4 text-[0.62rem] uppercase tracking-[0.22em] text-white/55`}
              >
                Get ready for 1 • 2 • 3
              </p>
            </div>
          </aside>
          <canvas ref={canvas} className="hidden" />
        </section>
      )}

      {step === "review" && (
        <section
          className="relative flex min-h-[100svh] justify-center overflow-hidden"
          style={{
            backgroundImage: "url('/thirdimage.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,6,5,0.8)_0%,rgba(7,6,5,0.48)_28%,rgba(7,6,5,0.16)_58%,rgba(7,6,5,0.04)_76%,transparent_100%)]" />
          <div className="review-copy absolute inset-x-0 bottom-[clamp(1.5rem,4vh,3.75rem)] z-10 mx-auto w-[min(94vw,900px)] px-4 text-center sm:px-6">
            <p
              className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.36em] text-[#d6b36a] sm:text-[0.7rem]`}
            >
              Your Photo
            </p>

            <h2
              className={`${cormorant.className} mt-3 text-[clamp(2.6rem,4vw,4.8rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#f8f1e6]`}
            >
              <span className="block">Looking</span>
              <span className="block text-[#d6b36a]">Beautiful</span>
            </h2>

            <p
              className={`${inter.className} mx-auto mt-4 max-w-[38rem] text-[clamp(0.92rem,1.3vw,1.1rem)] leading-6 text-white/80`}
            >
              Make sure your face and full body are clearly visible before
              continuing.
            </p>

            <div className="mt-5 flex justify-center sm:mt-6">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Customer preview"
                  className="max-h-[clamp(10rem,32svh,28rem)] max-w-[min(74vw,42rem)] rounded-[1.125rem] border border-[#d6b36a]/35 object-contain shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
                />
              ) : (
                <div className="flex min-h-[12rem] items-center justify-center rounded-[1.125rem] border border-dashed border-[#d6b36a]/35 px-6 text-center text-sm text-white/65 sm:min-h-[16rem]">
                  No photo captured yet. Please retake the selfie.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:mt-6 sm:flex-row">
              <button
                onClick={() => {
                  setCapturedImage("");
                  setStep("camera");
                }}
                className={`${inter.className} inline-flex min-h-14 w-full items-center justify-center rounded-full border border-white/35 px-7 py-4 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#f8f1e6] transition-colors hover:border-white/60 sm:w-auto sm:min-h-16 sm:px-9 sm:text-[0.8rem]`}
              >
                Retake
              </button>
              <button
                onClick={() => {
                  if (!capturedImage) {
                    setStep("camera");
                    return;
                  }
                  setOriginalCustomerImage(capturedImage);
                  setStep("catalogue");
                }}
                disabled={!capturedImage}
                className={`${inter.className} inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-7 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#1a120d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-h-16 sm:px-9 sm:text-[0.8rem]`}
              >
                Use This Photo
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "catalogue" && (
        <section
          className="relative min-h-[100svh] overflow-hidden p-4 sm:p-8"
          style={{
            backgroundImage: "url('/lastscreen.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[#090706]/55" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="catalogue-header text-center">
              <p
                className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.36em] text-[#d6b36a] sm:text-[0.7rem]`}
              >
                The Saree Collection
              </p>
              <h2
                className={`${cormorant.className} mt-4 text-[clamp(2.8rem,4.5vw,5rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[#f8f1e6]`}
              >
                <span className="block">Find Your</span>
                <span className="block text-[#d6b36a]">Perfect Saree</span>
              </h2>
              <p
                className={`${inter.className} mx-auto mt-4 max-w-xl text-[clamp(0.95rem,1.3vw,1.1rem)] text-white/78`}
              >
                Select a saree to see how it looks on you.
              </p>
            </div>

            <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {availableSarees.map((product, index) => (
                <article
                  key={product.id}
                  className="catalogue-card group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#d6b36a]/20 bg-[#100d0a]/94 shadow-[0_12px_35px_rgba(0,0,0,0.2)]"
                >
                  <div className="m-3 overflow-hidden rounded-[0.875rem] bg-[#f2eee7] p-2 sm:m-4">
                    <img
                      src={productImage(product)}
                      alt={product.name}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="aspect-[4/5] w-full object-contain transition-transform duration-200 ease-out"
                    />
                  </div>

                  <div className="flex flex-1 flex-col px-4 pb-4 sm:px-5 sm:pb-5">
                    <p
                      className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.26em] text-[#d6b36a]`}
                    >
                      {product.sareeType ?? "Saree"}
                    </p>
                    <h3
                      className={`${cormorant.className} mt-3 text-[clamp(1.45rem,2vw,1.8rem)] font-medium leading-[1.02] text-[#f8f1e6]`}
                    >
                      {product.name}
                    </h3>
                    <p
                      className={`${inter.className} mt-3 text-lg font-medium text-[#d6b36a]`}
                    >
                      ₹{product.price.toLocaleString("en-IN")}
                    </p>
                    <p
                      className={`${inter.className} mt-3 text-sm leading-5 text-white/65`}
                    >
                      {product.colour}{" "}
                      <span className="px-1 text-[#d6b36a]">•</span>{" "}
                      {product.fabric ?? "-"}
                    </p>
                    <button
                      onClick={() => void tryOnSaree(product)}
                      disabled={
                        !product.isTryOnReady || generationInFlight.current
                      }
                      className={`${inter.className} mt-auto flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#d6b36a] px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#17130d] shadow-[0_10px_24px_rgba(214,179,106,0.16)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_15px_28px_rgba(214,179,106,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-16 sm:text-[0.8rem]`}
                    >
                      {product.isTryOnReady ? (
                        <>
                          Try It On <span aria-hidden="true">→</span>
                        </>
                      ) : (
                        "Coming Soon"
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === "generating" && (
        <section className="ai-generation-screen relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-10 text-center sm:px-6">
          <div className="ai-generation-glow absolute" aria-hidden="true" />
          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
            <p
              className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.36em] text-[#d6b36a] sm:text-[0.7rem]`}
            >
              AI Saree Mirror
            </p>

            <div
              className="ai-saree-loader mt-[clamp(1.75rem,4vh,3rem)]"
              aria-hidden="true"
            >
              <div className="ai-loader-outer" />
              <div className="ai-loader-middle" />
              <div className="ai-loader-fabric" />
              <div className="ai-loader-center">
                <span className="ai-loader-petal ai-loader-petal-top" />
                <span className="ai-loader-petal ai-loader-petal-right" />
                <span className="ai-loader-petal ai-loader-petal-bottom" />
                <span className="ai-loader-petal ai-loader-petal-left" />
              </div>
            </div>

            <h2
              className={`${cormorant.className} mt-[clamp(1.75rem,4vh,3rem)] text-[clamp(3rem,5vw,5.5rem)] font-medium leading-[0.98] tracking-[-0.03em] text-[#f8f1e6]`}
            >
              <span className="block">Creating Your</span>
              <span className="block text-[#d6b36a]">Saree Look</span>
            </h2>

            <p
              key={loadingMessageIndex}
              role="status"
              aria-live="polite"
              className={`${inter.className} ai-status-message mt-5 text-[clamp(1rem,1.4vw,1.15rem)] text-white/78`}
            >
              {loadingStatusMessages[loadingMessageIndex]}
            </p>

            <div className="ai-progress-track mt-7" aria-hidden="true">
              <span />
            </div>

            <p
              className={`${inter.className} mt-5 text-[0.62rem] uppercase tracking-[0.28em] text-white/45 sm:text-[0.68rem]`}
            >
              Please keep this screen open
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

      {step === "result" && selectedSaree && previewGeneratedImage && (
        <section
          className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-10"
          style={{
            backgroundImage: "url('/lamb.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,6,5,0.78)_0%,rgba(7,6,5,0.48)_30%,rgba(7,6,5,0.16)_62%,rgba(7,6,5,0.05)_100%)]" />
          <div className="result-copy relative z-10 w-full max-w-5xl text-center">
            <p
              className={`${inter.className} text-[0.62rem] font-medium uppercase tracking-[0.36em] text-[#d6b36a] sm:text-[0.7rem]`}
            >
              Your Saree Reveal
            </p>
            <h2
              className={`${cormorant.className} mt-4 text-[clamp(3rem,5vw,5.5rem)] font-medium leading-[0.96] tracking-[-0.03em] text-[#f8f1e6]`}
            >
              <span className="block">Your Saree,</span>
              <span className="block text-[#d6b36a]">Your Style</span>
            </h2>
            <p
              className={`${inter.className} mx-auto mt-4 max-w-xl text-[clamp(0.95rem,1.3vw,1.1rem)] text-white/78`}
            >
              Created especially for you with Lotus AI.
            </p>

            <div className="mt-6 flex justify-center sm:mt-7">
              <img
                src={previewGeneratedImage}
                alt="AI generated saree preview"
                decoding="async"
                fetchPriority="high"
                className="max-h-[clamp(14rem,43svh,34rem)] max-w-[min(90vw,56rem)] rounded-[1rem] border border-[#d6b36a]/30 object-contain shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              />
            </div>

            <div className="mt-5">
              <h3
                className={`${cormorant.className} text-[clamp(1.5rem,2.2vw,2rem)] font-medium leading-tight text-[#f8f1e6]`}
              >
                {selectedSaree.name}
              </h3>
              <p
                className={`${inter.className} mt-2 text-sm text-white/68 sm:text-base`}
              >
                {selectedSaree.colour}{" "}
                <span className="px-1 text-[#d6b36a]">•</span>{" "}
                {selectedSaree.fabric ?? "-"}{" "}
                <span className="px-1 text-[#d6b36a]">•</span> ₹
                {selectedSaree.price.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="result-actions mt-6 grid gap-3 sm:mt-7 sm:grid-cols-3">
              <button
                onClick={() => setStep("catalogue")}
                className={`${inter.className} min-h-14 rounded-full bg-[#d6b36a] px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#17130d] shadow-[0_12px_28px_rgba(214,179,106,0.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(214,179,106,0.24)] active:translate-y-0 sm:min-h-16 sm:text-[0.8rem]`}
              >
                Try Another Saree <span aria-hidden="true">→</span>
              </button>
              <button
                onClick={() => void handlePngDownload()}
                disabled={downloadState === "preparing"}
                aria-label="Download your AI saree look as PNG"
                className={`${inter.className} min-h-14 rounded-full border border-[#d6b36a]/55 px-4 py-3 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[#f8f1e6] transition-colors hover:border-[#d6b36a]/80 hover:bg-[#d6b36a]/10 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-16 sm:text-[0.8rem]`}
              >
                {downloadState === "preparing"
                  ? "Preparing Download..."
                  : "Download PNG ↓"}
              </button>
              <button
                onClick={resetToWelcome}
                className={`${inter.className} min-h-14 rounded-full border border-white/30 px-4 py-3 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[#f8f1e6] transition-colors hover:border-white/60 sm:min-h-16 sm:text-[0.8rem]`}
              >
                Start Over
              </button>
            </div>

            <p
              className={`${inter.className} mt-4 text-[0.8rem] text-white/50`}
            >
              AI-generated preview. Actual appearance may vary.
            </p>
            {downloadState === "ready" && (
              <p
                className={`${inter.className} mt-3 text-[0.68rem] uppercase tracking-[0.24em] text-[#d6b36a]`}
              >
                Download ready
              </p>
            )}
            {downloadState === "error" && (
              <p className={`${inter.className} mt-3 text-sm text-white/70`}>
                We couldn&apos;t prepare the download. Please try again.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
