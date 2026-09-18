import type { GarmentType, Product, ProductCategory } from "./types";

export const GARMENT_TYPE_ORDER: GarmentType[] = [
  "saree",
  "kurti",
  "dress",
  "lehenga",
  "shirt",
  "tshirt",
  "top",
  "bottom",
];

export const garmentTypeConfig: Record<
  GarmentType,
  { label: string; productCategory: ProductCategory; description: string }
> = {
  saree: {
    label: "Sarees",
    productCategory: "one-pieces",
    description: "Explore our saree collection",
  },
  kurti: {
    label: "Kurtis",
    productCategory: "one-pieces",
    description: "Refined everyday silhouettes",
  },
  dress: {
    label: "Dresses",
    productCategory: "one-pieces",
    description: "Statement-ready looks",
  },
  lehenga: {
    label: "Lehengas",
    productCategory: "one-pieces",
    description: "Occasion elegance",
  },
  shirt: {
    label: "Shirts",
    productCategory: "tops",
    description: "Tailored layering",
  },
  tshirt: {
    label: "T-Shirts",
    productCategory: "tops",
    description: "Easy premium staples",
  },
  top: {
    label: "Tops",
    productCategory: "tops",
    description: "Polished everyday essentials",
  },
  bottom: {
    label: "Bottoms",
    productCategory: "bottoms",
    description: "Clean lines and fit",
  },
};

export function resolveProductCategory(
  garmentType: GarmentType,
): ProductCategory {
  return garmentTypeConfig[garmentType]?.productCategory ?? "tops";
}

export function mapGarmentTypeToFashnCategory(
  garmentType: Exclude<GarmentType, "saree">,
): "tops" | "bottoms" | "one-pieces" {
  switch (garmentType) {
    case "shirt":
    case "tshirt":
    case "top":
    case "kurti":
      return "tops";
    case "bottom":
      return "bottoms";
    case "dress":
    case "lehenga":
      return "one-pieces";
  }
}

export function resolveFashnCategory(
  product: Pick<Product, "garmentType" | "category" | "aiCategoryOverride">,
) {
  const override = product.aiCategoryOverride;
  if (override && ["tops", "bottoms", "one-pieces"].includes(override)) {
    return override as "tops" | "bottoms" | "one-pieces";
  }

  if (product.garmentType === "saree") {
    return "auto";
  }

  return mapGarmentTypeToFashnCategory(product.garmentType);
}
