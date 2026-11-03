import { NextRequest, NextResponse } from "next/server";

const RELAY_API = "https://api.relay.link";

/**
 * Server proxy for Relay Kit. Injects `x-api-key` so the browser never sees RELAY_API_KEY.
 * Set RELAY_API_KEY in Vercel (server-only). Without it, the proxy returns 503.
 */
async function proxy(req: NextRequest, path: string[]) {
  const apiKey = process.env.RELAY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "RELAY_API_KEY is not configured",
        hint: "Add RELAY_API_KEY in Vercel (server env). Create a key at https://relay.link",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const target = `${RELAY_API}/${path.join("/")}${url.search}`;

  const headers: HeadersInit = {
    "x-api-key": apiKey,
    accept: req.headers.get("accept") || "application/json",
  };
  const contentType = req.headers.get("content-type");
  if (contentType) {
    (headers as Record<string, string>)["content-type"] = contentType;
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }

  const upstream = await fetch(target, init);
  const outHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) outHeaders.set("content-type", upstreamType);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
