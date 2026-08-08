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

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
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
