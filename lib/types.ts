export type GenderCategory = "women" | "men" | "unisex";
export type GarmentType =
  | "saree"
  | "salwar-kameez"
  | "churidar"
  | "punjabi-suit"
  | "patiala-suit"
  | "anarkali"
  | "palazzo-suit"
  | "kurti"
  | "kurta"
  | "lehenga-choli"
  | "ghagra-choli"
  | "sharara"
  | "gharara"
  | "indo-western-women"
  | "dress"
  | "coord-set-women"
  | "shirt"
  | "tshirt"
  | "kurta-men"
  | "kurta-pajama"
  | "sherwani"
  | "nehru-jacket"
  | "bandhgala"
  | "jodhpuri"
  | "indo-western-men"
  | "dhoti-kurta"
  | "veshti-shirt"
  | "formal-trouser"
  | "chino"
  | "jeans"
  | "lehenga"
  | "top"
  | "bottom";
export type ProductCategory =
  | "recommended"
  | "tops"
  | "bottoms"
  | "one-pieces"
  | "sets"
  | "suits"
  | "outerwear";
export type SareeType =
  | "Kanjivaram"
  | "Banarasi"
  | "Mysore Silk"
  | "Cotton"
  | "Silk"
  | "Soft Silk"
  | "Tissue Silk"
  | "Georgette"
  | "Chiffon"
  | "Linen"
  | "Organza"
  | "Printed"
  | "Designer"
  | "Bridal"
  | "Other";
export type SareeDrapeStyle =
  | "standard-nivi"
  | "seedha-pallu"
  | "bengali"
  | "gujarati"
  | "custom";
export type Occasion =
  | "Wedding"
  | "Bridal"
  | "Festival"
  | "Party"
  | "Office"
  | "Casual"
  | "Traditional";
export type TryOnMode = "preview" | "quality";
export type ProviderName = "fashn" | "saree" | "standard";

export interface SareeDetails {
  sareeType?: SareeType;
  fabric?: string;
  weave?: string;
  occasion?: Occasion;
  sareeMainImage?: string;
  drapedReferenceImage?: string;
  palluImage?: string;
  borderImage?: string;
  blouseImage?: string;
  drapeStyle?: SareeDrapeStyle;
  aiCategoryOverride?: ProductCategory;
}

export interface FashionProduct {
  id: string;
  sku: string;
  name: string;
  genderCategory: GenderCategory;
  garmentType: GarmentType;
  subcategory: string;
  fabric: string;
  colour: string;
  colourFamily: string;
  pattern?: string;
  occasion: Occasion[];
  styleTags: string[];
  price: number;
  thumbnail: string;
  garmentImage: string;
  aiGarmentImage?: string;
  drapedReferenceImage?: string;
  topImage?: string;
  bottomImage?: string;
  providerOverride?: ProviderName;
  aiCategoryOverride?: ProductCategory;
  isTryOnReady: boolean;
  isRecommendationEligible: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  description: string;
  garmentType: GarmentType;
  category: ProductCategory;
  price: number;
  salePrice?: number;
  colour: string;
  colourFamily?: string;
  genderCategory?: GenderCategory;
  subcategory?: string;
  fabric?: string;
  pattern?: string;
  size?: string;
  garmentImage: string;
  aiGarmentImage?: string;
  thumbnail: string;
  featured?: boolean;
  active?: boolean;
  inStock?: boolean;
  createdAt?: string;
  sareeType?: SareeType;
  weave?: string;
  occasion?: Occasion;
  occasionTags?: Occasion[];
  styleTags?: string[];
  sareeMainImage?: string;
  drapedReferenceImage?: string;
  palluImage?: string;
  borderImage?: string;
  blouseImage?: string;
  drapeStyle?: SareeDrapeStyle;
  aiCategoryOverride?: ProductCategory;
  topImage?: string;
  bottomImage?: string;
  providerOverride?: ProviderName;
  isTryOnReady?: boolean;
  isRecommendationEligible?: boolean;
}

export interface VirtualTryOnRequest {
  customerImage: string;
  garmentType: GarmentType;
  garmentImage: string;
  garmentSource?: string;
  productId: string;
  productSku?: string;
  productName?: string;
  productColour?: string;
  mode: TryOnMode;
  saree?: {
    sareeType?: string;
    drapeStyle?: SareeDrapeStyle;
    sareeMainImage?: string;
    drapedReferenceImage?: string;
    palluImage?: string;
    borderImage?: string;
    blouseImage?: string;
  };
}

export interface VirtualTryOnResult {
  imageUrl: string;
  provider: ProviderName;
  status: "completed" | "failed";
  generationTimeMs?: number;
}

export interface FashionOutfit {
  id: string;
  topProduct: Product;
  bottomProduct: Product;
  alternativeBottomProducts?: Product[];
  recommendationReason: string;
  score: number;
}
