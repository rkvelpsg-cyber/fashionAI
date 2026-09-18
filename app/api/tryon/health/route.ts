import { NextResponse } from "next/server";
import { FASHN_MODEL, FASHN_PROVIDER } from "@/lib/fashn";

export function GET() {
  const apiKeyConfigured = Boolean(process.env.FASHN_API_KEY);

  return NextResponse.json({
    mode: process.env.AI_DEMO_MODE === "true" ? "demo" : "real",
    provider: FASHN_PROVIDER,
    model: FASHN_MODEL,
    apiKeyConfigured,
    customerImageSupport: "base64 data URLs and remote URLs",
    garmentImageSupport: "base64 data URLs and remote URLs",
    ready: process.env.AI_DEMO_MODE === "true" || apiKeyConfigured,
  });
}
