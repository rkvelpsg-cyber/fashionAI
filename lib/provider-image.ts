import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function localPublicPath(imageInput: string) {
  const url = imageInput.startsWith("/")
    ? new URL(imageInput, "http://localhost")
    : new URL(imageInput);

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return null;
  }

  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith("/products/")) return null;

  return path.join(process.cwd(), "public", pathname);
}

export function toProviderImageInput(imageInput: string) {
  if (imageInput.startsWith("data:image/")) return imageInput;

  const localPath = localPublicPath(imageInput);
  if (!localPath) return imageInput;

  if (!existsSync(localPath)) {
    throw new Error(`INVALID_IMAGE: local image not found at ${localPath}`);
  }

  const extension = path.extname(localPath).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw new Error(`UNSUPPORTED_INPUT: unsupported image type ${extension}`);
  }

  const base64 = readFileSync(localPath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export function describeImageInput(imageInput: string) {
  if (imageInput.startsWith("data:image/")) return "data-url";
  if (
    imageInput.startsWith("/products/") ||
    imageInput.includes("/products/")
  ) {
    return "local-public-image";
  }
  return "remote-url";
}
