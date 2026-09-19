import { demoProducts } from "./products";
import type { GarmentType, Product } from "./types";

export function getAvailableCatalogueProducts(): Product[] {
  return demoProducts.filter(
    (product) =>
      product.garmentType === "saree" &&
      product.active !== false &&
      product.inStock !== false,
  );
}

export function getCatalogByGarmentType(garmentType: GarmentType): Product[] {
  return getAvailableCatalogueProducts().filter(
    (product) => product.garmentType === garmentType,
  );
}

export function getCatalogueInventory() {
  return {
    all: getAvailableCatalogueProducts(),
    sarees: getAvailableCatalogueProducts(),
    byGarmentType: Object.fromEntries(
      Array.from(
        new Set(
          getAvailableCatalogueProducts().map((product) => product.garmentType),
        ),
      ).map((type) => [
        type,
        getAvailableCatalogueProducts().filter(
          (product) => product.garmentType === type,
        ),
      ]),
    ),
  };
}

export function getTryOnReadyProducts(): Product[] {
  return getAvailableCatalogueProducts().filter(
    (product) => product.isTryOnReady !== false,
  );
}
