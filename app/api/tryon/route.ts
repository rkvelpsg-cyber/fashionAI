import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { FASHN_MODEL, FASHN_PROVIDER } from "@/lib/fashn";
import { VirtualTryOnRouter } from "@/lib/virtual-tryon";

const schema = z.object({
  customerImage: z.string().min(1),
  garmentType: z.enum([
    "saree",
    "kurti",
    "dress",
    "lehenga",
    "shirt",
    "tshirt",
    "top",
    "bottom",
  ]),
  garmentImage: z.string().min(1),
  productId: z.string().min(1),
  productSku: z.string().optional(),
  productName: z.string().optional(),
  mode: z.enum(["preview", "quality"]).default("preview"),
  saree: z
    .object({
      sareeType: z.string().optional(),
      drapeStyle: z
        .enum([
          "standard-nivi",
          "seedha-pallu",
          "bengali",
          "gujarati",
          "custom",
        ])
        .optional(),
      sareeMainImage: z.string().optional(),
      drapedReferenceImage: z.string().optional(),
      palluImage: z.string().optional(),
      borderImage: z.string().optional(),
      blouseImage: z.string().optional(),
    })
    .optional(),
});

const router = new VirtualTryOnRouter();

export async function POST(req: NextRequest) {
  const started = Date.now();
  let requestContext: {
    garmentType?: string;
    mode?: string;
    productSku?: string;
    garmentImage?: string;
  } = {};

  try {
    const input = schema.parse(await req.json());
    requestContext = {
      garmentType: input.garmentType,
      mode: input.mode,
      productSku: input.productSku,
      garmentImage: input.garmentImage,
    };

    console.info(
      `[TryOn] mode: REAL garmentType: ${input.garmentType} sku: ${input.productSku ?? "MISSING"} provider: ${FASHN_PROVIDER} model: ${FASHN_MODEL} customerImage: ${input.customerImage ? "PRESENT" : "MISSING"} garmentImage: ${input.garmentImage ? "PRESENT" : "MISSING"} apiKey: ${process.env.FASHN_API_KEY ? "CONFIGURED" : "MISSING"} requestStarted: true garmentImagePath: ${input.garmentImage}`,
    );

    if (
      process.env.NODE_ENV === "development" &&
      process.env.AI_DEMO_MODE !== "true" &&
      input.garmentType !== "saree" &&
      /\.(svg|gif)(?:$|\?)/i.test(input.garmentImage)
    ) {
      throw new Error("REAL_GARMENT_IMAGE_REQUIRED");
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.AI_DEMO_MODE !== "true" &&
      input.garmentType === "saree"
    ) {
      const imagePath = new URL(input.garmentImage).pathname;
      if (!/\.(png|jpe?g|webp)$/i.test(imagePath)) {
        throw new Error("Saree try-on requires a photographic product image");
      }

      if (!imagePath.startsWith("/products/sarees/")) {
        throw new Error("Saree try-on requires a configured product asset");
      }

      const localFile = path.join(process.cwd(), "public", imagePath);
      if (!existsSync(localFile)) {
        throw new Error(`Missing saree product image: ${imagePath}`);
      }
    }

    const result = await router.route(input);
    const generationTimeMs = Date.now() - started;

    console.info(
      `[TryOn] providerStatus: ${result.status} generationTimeMs: ${generationTimeMs} success: true provider: ${FASHN_PROVIDER} model: ${FASHN_MODEL}`,
    );

    return NextResponse.json({
      success: true,
      ...result,
      generationTimeMs,
    });
  } catch (error) {
    const generationTimeMs = Date.now() - started;
    console.error(
      `[TryOn] providerStatus: failed generationTimeMs: ${generationTimeMs} success: false errorType: ${error instanceof Error ? error.name : "UnknownError"} safeError: ${error instanceof Error ? error.message : "Generation failed"} garmentType: ${requestContext.garmentType ?? "MISSING"} sku: ${requestContext.productSku ?? "MISSING"} provider: ${FASHN_PROVIDER} model: ${FASHN_MODEL} garmentImagePath: ${requestContext.garmentImage ?? "MISSING"}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Generation failed",
      },
      { status: 400 },
    );
  }
}
