import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function upstreamBase(): string | null {
  const raw =
    process.env.API_UPSTREAM_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const base = upstreamBase();
  if (!base) {
    return NextResponse.json(
      { error: "API_UPSTREAM_URL (or NEXT_PUBLIC_API_URL) is not set" },
      { status: 502 },
    );
  }

  const target = `${base}/api/${pathSegments.join("/")}${req.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("[api-proxy]", target, error);
    return NextResponse.json(
      { error: "Failed to reach API upstream" },
      { status: 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  const contentType =
    upstream.headers.get("content-type") ?? "application/json";

  // The poll job only refreshes every few minutes, so most refetches ask for
  // bytes the client already has. Tagging the payload lets an unchanged one come
  // back as a ~300 byte 304 instead of the full response — the roster alone is
  // ~158KB, re-pulled by every open tab on every interval.
  //
  // `must-revalidate` with max-age=0 keeps the data live: the browser always
  // asks, it just gets told "unchanged" cheaply. Errors are never tagged.
  const etag =
    upstream.ok && body.byteLength > 0 ? weakEtag(body) : null;

  if (etag && req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { etag, "cache-control": "no-cache, must-revalidate" },
    });
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": etag ? "no-cache, must-revalidate" : "no-store",
      ...(etag ? { etag } : {}),
    },
  });
}

/** Length + FNV-1a over the body — enough to spot a changed payload. */
function weakEtag(body: ArrayBuffer): string {
  const bytes = new Uint8Array(body);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `W/"${bytes.length.toString(36)}-${hash.toString(36)}"`;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-origin": "*",
    },
  });
}
