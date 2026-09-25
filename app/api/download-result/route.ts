import { NextRequest } from "next/server";

function isFashnResultUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    return (
      url.protocol === "https:" &&
      (url.hostname === "fashn.ai" || url.hostname.endsWith(".fashn.ai"))
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("imageUrl");
  if (!imageUrl || !isFashnResultUrl(imageUrl)) {
    return new Response("Invalid result image", { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(imageUrl, {
      cache: "no-store",
      redirect: "error",
    });
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    if (!upstreamResponse.ok || !contentType.startsWith("image/")) {
      return new Response("Result image unavailable", { status: 502 });
    }

    return new Response(upstreamResponse.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Result image unavailable", { status: 502 });
  }
}
