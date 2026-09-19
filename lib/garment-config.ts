import type { GarmentType, Product, ProductCategory } from "./types";

export const GARMENT_TYPE_ORDER: GarmentType[] = [
  "saree",
  "salwar-kameez",
  "churidar",
  "punjabi-suit",
  "patiala-suit",
  "anarkali",
  "palazzo-suit",
  "kurti",
  "kurta",
  "lehenga-choli",
  "ghagra-choli",
  "sharara",
  "gharara",
  "indo-western-women",
  "dress",
  "coord-set-women",
  "shirt",
  "tshirt",
  "kurta-men",
  "kurta-pajama",
  "sherwani",
  "nehru-jacket",
  "bandhgala",
  "jodhpuri",
  "indo-western-men",
  "dhoti-kurta",
  "veshti-shirt",
  "formal-trouser",
  "chino",
  "jeans",
  "lehenga",
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
  "salwar-kameez": {
    label: "Salwar Kameez",
    productCategory: "suits",
    description: "Graceful everyday elegance",
  },
  churidar: {
    label: "Churidars",
    productCategory: "bottoms",
    description: "Tailored movement and comfort",
  },
  "punjabi-suit": {
    label: "Punjabi Suits",
    productCategory: "suits",
    description: "Festive classic silhouettes",
  },
  "patiala-suit": {
    label: "Patiala Suits",
    productCategory: "suits",
    description: "Volume and comfort in balance",
  },
  anarkali: {
    label: "Anarkalis",
    productCategory: "one-pieces",
    description: "Statement occasion silhouettes",
  },
  "palazzo-suit": {
    label: "Palazzo Suits",
    productCategory: "suits",
    description: "A refined relaxed statement",
  },
  kurti: {
    label: "Kurtis",
    productCategory: "tops",
    description: "Refined everyday silhouettes",
  },
  kurta: {
    label: "Kurtas",
    productCategory: "tops",
    description: "Tailored festive versatility",
  },
  "lehenga-choli": {
    label: "Lehenga Cholis",
    productCategory: "one-pieces",
    description: "Occasion elegance",
  },
  "ghagra-choli": {
    label: "Ghagra Cholis",
    productCategory: "one-pieces",
    description: "Celebration-ready finishes",
  },
  sharara: {
    label: "Shararas",
    productCategory: "bottoms",
    description: "Fluid silhouettes and movement",
  },
  gharara: {
    label: "Ghararas",
    productCategory: "bottoms",
    description: "Classic festive volume",
  },
  "indo-western-women": {
    label: "Indo-Western Women",
    productCategory: "sets",
    description: "Modern fusion styling",
  },
  dress: {
    label: "Dresses",
    productCategory: "one-pieces",
    description: "Statement-ready looks",
  },
  "coord-set-women": {
    label: "Coord Sets",
    productCategory: "sets",
    description: "Polished co-ord dressing",
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
  "kurta-men": {
    label: "Men's Kurtas",
    productCategory: "tops",
    description: "Elevated ethnic refinement",
  },
  "kurta-pajama": {
    label: "Kurta Pajamas",
    productCategory: "sets",
    description: "Comfort with ceremony",
  },
  sherwani: {
    label: "Sherwanis",
    productCategory: "one-pieces",
    description: "Wedding luxury silhouettes",
  },
  "nehru-jacket": {
    label: "Nehru Jackets",
    productCategory: "outerwear",
    description: "Structured elegance",
  },
  bandhgala: {
    label: "Bandhgalas",
    productCategory: "outerwear",
    description: "Tailored ceremonial polish",
  },
  jodhpuri: {
    label: "Jodhpuri",
    productCategory: "outerwear",
    description: "A refined occasion edge",
  },
  "indo-western-men": {
    label: "Indo-Western Men",
    productCategory: "sets",
    description: "Smart layering and fusion",
  },
  "dhoti-kurta": {
    label: "Dhoti Kurtas",
    productCategory: "sets",
    description: "Traditional finish with modern ease",
  },
  "veshti-shirt": {
    label: "Veshti Shirts",
    productCategory: "sets",
    description: "Classic festive drape",
  },
  "formal-trouser": {
    label: "Formal Trousers",
    productCategory: "bottoms",
    description: "Tailored structure",
  },
  chino: {
    label: "Chinos",
    productCategory: "bottoms",
    description: "Smart everyday versatility",
  },
  jeans: {
    label: "Jeans",
    productCategory: "bottoms",
    description: "Modern denim essential",
  },
  lehenga: {
    label: "Lehengas",
    productCategory: "one-pieces",
    description: "Occasion elegance",
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
    case "kurta":
    case "kurta-men":
    case "kurta-pajama":
    case "shirt":
      return "tops";
    case "bottom":
    case "formal-trouser":
    case "chino":
    case "jeans":
    case "churidar":
    case "sharara":
    case "gharara":
      return "bottoms";
    case "dress":
    case "lehenga":
    case "lehenga-choli":
    case "ghagra-choli":
    case "sherwani":
    case "anarkali":
    case "salwar-kameez":
    case "patiala-suit":
    case "punjabi-suit":
    case "palazzo-suit":
      return "one-pieces";
    default:
      return "tops";
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
