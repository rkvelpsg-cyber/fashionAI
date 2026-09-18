import { resolveFashnCategory } from "./garment-config";
import { toProviderImageInput } from "./provider-image";
import type { GarmentType, Product, VirtualTryOnRequest } from "./types";

export const FASHN_PROVIDER = "fashn";
export const FASHN_MODEL = "tryon-v1.6";
export const FASHN_RUN_ENDPOINT = "https://api.fashn.ai/v1/run";

export type InternalTryOnInput = {
  customerImage: string;
  garmentImage: string;
  garmentType: GarmentType;
  productSku?: string;
  category?: string;
  mode: "preview" | "quality";
  product?: Pick<Product, "garmentType" | "category" | "aiCategoryOverride">;
};

export async function generateTryOn(input: InternalTryOnInput) {
  const resolvedMode = input.mode === "preview" ? "performance" : "quality";
  const category =
    input.category ??
    resolveFashnCategory({
      garmentType: input.garmentType,
      category: input.product?.category ?? "tops",
      aiCategoryOverride: input.product?.aiCategoryOverride,
    });

  if (process.env.AI_DEMO_MODE === "true") {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return {
      imageUrl: input.customerImage,
      provider: "fashn" as const,
      status: "completed" as const,
    };
  }

  const key = process.env.FASHN_API_KEY;
  if (!key) throw new Error("FASHN_API_KEY is not configured");

  if (/\.(svg|gif)$/i.test(new URL(input.garmentImage).pathname)) {
    throw new Error("REAL_GARMENT_IMAGE_REQUIRED");
  }

  const modelImage = toProviderImageInput(input.customerImage);
  const garmentImage = toProviderImageInput(input.garmentImage);

  const create = await fetch(FASHN_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_name: FASHN_MODEL,
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        category,
        mode: resolvedMode,
        num_samples: 1,
        output_format: "jpeg",
        segmentation_free: true,
        garment_photo_type: "auto",
        moderation_level: "conservative",
      },
    }),
  });

  if (!create.ok) {
    const message = await create.text();
    throw new Error(
      `PROVIDER_${create.status}: ${message.slice(0, 500) || "FASHN request failed"}`,
    );
  }

  const job = await create.json();

  for (let i = 0; i < 90; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const res = await fetch(`https://api.fashn.ai/v1/status/${job.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(
        `PROVIDER_${res.status}: ${message.slice(0, 500) || "FASHN status request failed"}`,
      );
    }
    const data = await res.json();

    if (data.status === "completed") {
      const imageUrl = data.output?.[0];
      if (!imageUrl) throw new Error("FASHN returned no generated image");

      return {
        imageUrl,
        provider: "fashn" as const,
        status: "completed" as const,
      };
    }

    if (data.status === "failed") {
      throw new Error(
        `PROVIDER_FAILED: ${data.error?.message || "Generation failed"}`,
      );
    }
  }

  throw new Error("Generation timed out");
}

export function createRouteRequest(
  request: VirtualTryOnRequest,
): InternalTryOnInput {
  return {
    customerImage: request.customerImage,
    garmentImage: request.garmentImage,
    garmentType: request.garmentType,
    productSku: request.productSku,
    category: resolveFashnCategory({
      garmentType: request.garmentType,
      category: "tops",
      aiCategoryOverride: request.saree?.drapeStyle ? "one-pieces" : undefined,
    }),
    mode: request.mode,
  };
}
