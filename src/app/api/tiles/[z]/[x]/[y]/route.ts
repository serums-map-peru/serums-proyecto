import { NextResponse } from "next/server";

export const runtime = "nodejs";

const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X+7QAAAABJRU5ErkJggg==",
  "base64",
);

function parseTileNumber(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (String(i) !== String(value)) return null;
  return i;
}

export async function GET(
  _request: Request,
  { params }: { params: { z: string; x: string; y: string } | Promise<{ z: string; x: string; y: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const z = parseTileNumber(String(resolvedParams?.z ?? ""));
  const x = parseTileNumber(String(resolvedParams?.x ?? ""));
  const y = parseTileNumber(String(resolvedParams?.y ?? ""));

  if (z == null || x == null || y == null || z < 0 || z > 20 || x < 0 || y < 0) {
    return new NextResponse(transparentPng, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  const upstreamUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(upstreamUrl, {
      headers: { "user-agent": "SERUMS-Map-Peru/1.0" },
      cache: "force-cache",
    });

    if (!res.ok) {
      return new NextResponse(transparentPng, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=300",
        },
      });
    }

    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") || "image/png",
        "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(transparentPng, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=300",
      },
    });
  }
}

