export type GarmentType =
  | "saree"
  | "kurti"
  | "dress"
  | "lehenga"
  | "shirt"
  | "tshirt"
  | "top"
  | "bottom";
export type ProductCategory = "tops" | "bottoms" | "one-pieces";
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
export type ProviderName = "fashn" | "saree";

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
  size?: string;
  garmentImage: string;
  thumbnail: string;
  featured?: boolean;
  active?: boolean;
  inStock?: boolean;
  createdAt?: string;
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

export interface VirtualTryOnRequest {
  customerImage: string;
  garmentType: GarmentType;
  garmentImage: string;
  productId: string;
  productSku?: string;
  productName?: string;
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
