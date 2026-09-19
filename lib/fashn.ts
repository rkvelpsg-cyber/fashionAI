import { resolveFashnCategory } from "./garment-config";
import { toProviderImageInput } from "./provider-image";
import type { GarmentType, Product, VirtualTryOnRequest } from "./types";

export const FASHN_PROVIDER = "fashn";
export const FASHN_MODEL = "tryon-v1.6";
export const FASHN_RUN_ENDPOINT = "https://api.fashn.ai/v1/run";

export type InternalTryOnInput = {
  customerImage: string;
  garmentImage: string;
  garmentSource?: string;
  garmentType: GarmentType;
  productSku?: string;
  productColour?: string;
  category?: string;
  mode: "preview" | "quality";
  product?: Pick<Product, "garmentType" | "category" | "aiCategoryOverride">;
};

type TryOnStage =
  | "IMAGE_RESOLUTION"
  | "REQUEST_CREATION"
  | "FASHN_RUN"
  | "FASHN_POLL"
  | "RESULT_EXTRACTION";

class TryOnPipelineError extends Error {
  constructor(
    message: string,
    readonly stage: TryOnStage,
    readonly httpStatus?: number,
    readonly providerStatus?: string,
    readonly providerError?: string,
  ) {
    super(message);
    this.name = "TryOnPipelineError";
  }
}

function imagePathname(imageInput: string) {
  return imageInput.startsWith("/") ? imageInput : new URL(imageInput).pathname;
}

export async function generateTryOn(input: InternalTryOnInput) {
  try {
    const resolvedMode = input.mode === "preview" ? "performance" : "quality";
    const category =
      input.category ??
      resolveFashnCategory({
        garmentType: input.garmentType,
        category: input.product?.category ?? "tops",
        aiCategoryOverride: input.product?.aiCategoryOverride,
      });

    if (!input.customerImage) {
      throw new TryOnPipelineError(
        "CUSTOMER_IMAGE_REQUIRED",
        "IMAGE_RESOLUTION",
      );
    }

    if (!input.garmentImage) {
      throw new TryOnPipelineError(
        "GARMENT_IMAGE_REQUIRED",
        "IMAGE_RESOLUTION",
      );
    }

    if (process.env.AI_DEMO_MODE === "true") {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      return {
        imageUrl: input.customerImage,
        provider: "fashn" as const,
        status: "completed" as const,
      };
    }

    const key = process.env.FASHN_API_KEY;
    if (!key) {
      throw new TryOnPipelineError(
        "FASHN_API_KEY is not configured",
        "REQUEST_CREATION",
      );
    }

    if (/\.(svg|gif)$/i.test(imagePathname(input.garmentImage))) {
      throw new TryOnPipelineError(
        "REAL_GARMENT_IMAGE_REQUIRED",
        "IMAGE_RESOLUTION",
      );
    }

    let modelImage: string;
    let garmentImage: string;
    try {
      modelImage = toProviderImageInput(input.customerImage);
      garmentImage = toProviderImageInput(input.garmentImage);
    } catch (error) {
      throw new TryOnPipelineError(
        error instanceof Error ? error.message : "IMAGE_RESOLUTION_FAILED",
        "IMAGE_RESOLUTION",
      );
    }

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
      throw new TryOnPipelineError(
        `PROVIDER_${create.status}: ${message.slice(0, 500) || "FASHN request failed"}`,
        "FASHN_RUN",
        create.status,
        "failed",
        message.slice(0, 500) || "FASHN request failed",
      );
    }

    const job = await create.json().catch(() => null);
    if (!job?.id) {
      throw new TryOnPipelineError(
        "FASHN prediction id missing",
        "REQUEST_CREATION",
        create.status,
        job?.status,
        "prediction id missing",
      );
    }

    for (let i = 0; i < 90; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const res = await fetch(`https://api.fashn.ai/v1/status/${job.id}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new TryOnPipelineError(
          `PROVIDER_${res.status}: ${message.slice(0, 500) || "FASHN status request failed"}`,
          "FASHN_POLL",
          res.status,
          "failed",
          message.slice(0, 500) || "FASHN status request failed",
        );
      }
      const data = await res.json();

      if (data.status === "completed") {
        const imageUrl = data.output?.[0];
        if (!imageUrl) {
          throw new TryOnPipelineError(
            "FASHN returned no generated image",
            "RESULT_EXTRACTION",
            res.status,
            data.status,
            "missing output image",
          );
        }

        return {
          imageUrl,
          provider: "fashn" as const,
          status: "completed" as const,
        };
      }

      if (data.status === "failed") {
        throw new TryOnPipelineError(
          `PROVIDER_FAILED: ${data.error?.message || "Generation failed"}`,
          "FASHN_POLL",
          res.status,
          data.status,
          data.error?.message || "Generation failed",
        );
      }
    }

    throw new TryOnPipelineError("Generation timed out", "FASHN_POLL");
  } catch (error) {
    throw error;
  }
}

export function createRouteRequest(
  request: VirtualTryOnRequest,
): InternalTryOnInput {
  return {
    customerImage: request.customerImage,
    garmentImage: request.garmentImage,
    garmentSource: request.garmentSource,
    garmentType: request.garmentType,
    productSku: request.productSku,
    productColour: request.productColour,
    category: resolveFashnCategory({
      garmentType: request.garmentType,
      category: "tops",
      aiCategoryOverride: request.saree?.drapeStyle ? "one-pieces" : undefined,
    }),
    mode: request.mode,
  };
}
