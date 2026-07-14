import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_API_BASE = "https://api.unsplash.com/search/photos";
const cache = new Map<string, string>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (cache.has(query)) {
    return NextResponse.json({ url: cache.get(query) });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json(
      { error: "Missing UNSPLASH_ACCESS_KEY in environment" },
      { status: 500 }
    );
  }

  const response = await fetch(
    `${UNSPLASH_API_BASE}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      next: { revalidate: 60 * 60 * 6 },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to fetch image from Unsplash" },
      { status: response.status }
    );
  }

  const data = await response.json();
  const url = data.results?.[0]?.urls?.regular ?? null;

  if (url) {
    cache.set(query, url);
  }

  return NextResponse.json({ url });
}
