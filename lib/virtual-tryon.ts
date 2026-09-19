import type {
  GarmentType,
  VirtualTryOnRequest,
  VirtualTryOnResult,
} from "./types";
import { generateTryOn } from "./fashn";
import { mapGarmentTypeToFashnCategory } from "./garment-config";
import { toProviderImageInput } from "./provider-image";

const FASHN_MAX_MODEL = "tryon-max";
const FASHN_RUN_ENDPOINT = "https://api.fashn.ai/v1/run";
const FASHN_STATUS_ENDPOINT = "https://api.fashn.ai/v1/status";
const SAREE_PROMPT =
  "Place the referenced traditional Indian saree on the person. Preserve the original green silk fabric, gold motifs and gold border. Use a traditional Nivi saree drape with a matching fitted blouse, front waist pleats, full-length saree extending to the feet, and pallu naturally draped over the left shoulder. Preserve the person's identity, face, body proportions, pose and background.";
export interface VirtualTryOnProvider {
  generate(request: VirtualTryOnRequest): Promise<VirtualTryOnResult>;
}

export class FashnTryOnProvider implements VirtualTryOnProvider {
  async generate(request: VirtualTryOnRequest): Promise<VirtualTryOnResult> {
    const fashnCategory =
      request.garmentType === "saree"
        ? "auto"
        : mapGarmentTypeToFashnCategory(request.garmentType);
    const fashnMode =
      request.garmentType === "shirt" ? "quality" : request.mode;

    return generateTryOn({
      customerImage: request.customerImage,
      garmentImage: request.garmentImage,
      garmentSource: request.garmentSource,
      garmentType: request.garmentType,
      productSku: request.productSku,
      productColour: request.productColour,
      category: fashnCategory,
      mode: fashnMode,
    });
  }
}

export class SareeTryOnProvider implements VirtualTryOnProvider {
  constructor(
    private readonly maxProvider = new FashnTryOnMaxProvider(),
    private readonly fallbackProvider = new FashnTryOnProvider(),
  ) {}

  async generate(request: VirtualTryOnRequest): Promise<VirtualTryOnResult> {
    if (request.garmentType !== "saree") {
      return this.fallbackProvider.generate(request);
    }

    const selectedGarmentInput =
      request.saree?.drapedReferenceImage ??
      request.saree?.sareeMainImage ??
      request.garmentImage;
    const garmentSource = request.saree?.drapedReferenceImage
      ? "drapedReferenceImage"
      : request.saree?.sareeMainImage
        ? "sareeMainImage"
        : "garmentImage";

    console.info(
      `[Saree Product] sku: ${request.productSku ?? "MISSING"} name: ${request.productName ?? "MISSING"} garmentType: saree imageSource: ${garmentSource} imagePath: ${selectedGarmentInput}`,
    );
    console.info(
      `[Saree Generation] sku: ${request.productSku ?? "MISSING"} provider: fashn-max model: tryon-max customerImage: ORIGINAL productImageSource: ${garmentSource} productImagePresent: ${Boolean(selectedGarmentInput)} generationMode: quality resolution: 1k requestStarted: true`,
    );

    const result = await this.maxProvider.generate({
      ...request,
      garmentImage: selectedGarmentInput,
      mode: "quality",
    });
    return { ...result, provider: "saree" };
  }
}

export class FashnTryOnMaxProvider implements VirtualTryOnProvider {
  async generate(request: VirtualTryOnRequest): Promise<VirtualTryOnResult> {
    const key = process.env.FASHN_API_KEY;
    const modelImage = toProviderImageInput(request.customerImage);
    const productImage = toProviderImageInput(request.garmentImage);

    console.info(
      `[FASHN MAX REQUEST] model_name: ${FASHN_MAX_MODEL} modelImagePresent: ${Boolean(modelImage)} productImagePresent: ${Boolean(productImage)} productImageSource: drapedReferenceImage promptPresent: ${Boolean(SAREE_PROMPT)} generation_mode: quality resolution: 1k num_images: 1 apiKeyConfigured: ${Boolean(key)}`,
    );

    if (!key) {
      throw new Error("FASHN_API_KEY is not configured");
    }

    const response = await fetch(FASHN_RUN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_name: FASHN_MAX_MODEL,
        inputs: {
          model_image: modelImage,
          product_image: productImage,
          prompt: SAREE_PROMPT,
          generation_mode: "quality",
          resolution: "1k",
          num_images: 1,
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    const predictionId = payload?.id ?? payload?.prediction_id ?? null;

    if (!response.ok) {
      console.error(
        `[FASHN MAX ERROR] HTTP status: ${response.status} error name: ${payload?.error?.name ?? "ProviderRequestError"} error message: ${payload?.error?.message ?? payload?.message ?? "FASHN Try-On Max request failed"} prediction ID: ${predictionId ?? "MISSING"} prediction status: ${payload?.status ?? "MISSING"} runtime error: ${payload?.error ?? "MISSING"}`,
      );
      throw new Error(`FASHN_MAX_${response.status}`);
    }

    if (!predictionId) {
      console.error(
        `[FASHN MAX ERROR] HTTP status: ${response.status} error name: InvalidProviderResponse error message: prediction ID missing prediction ID: MISSING prediction status: ${payload?.status ?? "MISSING"} runtime error: MISSING`,
      );
      throw new Error("FASHN_MAX_PREDICTION_ID_MISSING");
    }

    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `${FASHN_STATUS_ENDPOINT}/${predictionId}`,
        { headers: { Authorization: `Bearer ${key}` } },
      );
      const statusPayload = await statusResponse.json().catch(() => null);
      const status = statusPayload?.status ?? "unknown";

      if (!statusResponse.ok) {
        console.error(
          `[FASHN MAX ERROR] HTTP status: ${statusResponse.status} error name: ProviderStatusError error message: ${statusPayload?.error?.message ?? statusPayload?.message ?? "FASHN status request failed"} prediction ID: ${predictionId} prediction status: ${status} runtime error: ${statusPayload?.error ?? "MISSING"}`,
        );
        throw new Error(`FASHN_MAX_STATUS_${statusResponse.status}`);
      }

      if (status === "completed") {
        const imageUrl = statusPayload?.output?.[0] ?? statusPayload?.output;
        if (typeof imageUrl !== "string" || !imageUrl) {
          throw new Error("FASHN_MAX_OUTPUT_MISSING");
        }

        return {
          imageUrl,
          provider: "saree",
          status: "completed",
        };
      }

      if (status === "failed") {
        console.error(
          `[FASHN MAX ERROR] HTTP status: ${statusResponse.status} error name: ProviderGenerationError error message: ${statusPayload?.error?.message ?? statusPayload?.message ?? "FASHN Try-On Max generation failed"} prediction ID: ${predictionId} prediction status: ${status} runtime error: ${statusPayload?.error ?? "MISSING"}`,
        );
        throw new Error("FASHN_MAX_GENERATION_FAILED");
      }
    }

    throw new Error("FASHN_MAX_TIMED_OUT");
  }
}

export class VirtualTryOnRouter {
  constructor(
    private readonly providers: Partial<
      Record<GarmentType, VirtualTryOnProvider>
    > = {
      saree: new SareeTryOnProvider(),
    },
  ) {}

  async route(request: VirtualTryOnRequest): Promise<VirtualTryOnResult> {
    const provider = this.providers[request.garmentType];
    if (!provider) {
      throw new Error(
        `No provider configured for garment type: ${request.garmentType}`,
      );
    }

    return provider.generate(request);
  }
}
