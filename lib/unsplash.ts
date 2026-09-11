import { buildReferenceQuery } from "@/lib/reference-query";
import type { ReferenceImage, SearchReferencesInput, SearchResponse } from "@/lib/types";

type UnsplashPhoto = {
  id: string;
  width: number;
  height: number;
  color?: string;
  alt_description?: string | null;
  description?: string | null;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  links: {
    html: string;
    download_location: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
};

type UnsplashSearchResponse = {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
};

export function normalizeUnsplashPhoto(
  photo: UnsplashPhoto,
  input: Pick<SearchReferencesInput, "query" | "category" | "difficulty">
): ReferenceImage {
  const trackingParams = "utm_source=draw_this&utm_medium=referral";

  return {
    id: `unsplash:${photo.id}`,
    provider: "unsplash",
    providerId: photo.id,
    width: photo.width,
    height: photo.height,
    color: photo.color,
    alt: photo.alt_description || photo.description || input.query || "Drawing reference",
    urls: photo.urls,
    photographer: {
      name: photo.user.name,
      url: `${photo.user.links.html}?${trackingParams}`
    },
    attributionUrl: `${photo.links.html}?${trackingParams}`,
    downloadLocation: photo.links.download_location,
    sourceQuery: input.query,
    category: input.category,
    difficulty: input.difficulty
  };
}

export async function searchReferences(input: SearchReferencesInput): Promise<SearchResponse> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const page = input.page ?? 1;
  const query = buildReferenceQuery(input);

  if (!accessKey) {
    return {
      results: [],
      query,
      page,
      warning: "Missing UNSPLASH_ACCESS_KEY. Add it to .env.local to retrieve real references."
    };
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "18");
  url.searchParams.set("content_filter", "high");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1"
    },
    next: {
      revalidate: 300
    }
  });

  if (!response.ok) {
    throw new Error(`Unsplash request failed with ${response.status}`);
  }

  const data = (await response.json()) as UnsplashSearchResponse;
  const excluded = new Set(input.excludeIds ?? []);
  const results = data.results
    .filter((photo) => !excluded.has(photo.id) && !excluded.has(`unsplash:${photo.id}`))
    .map((photo) => normalizeUnsplashPhoto(photo, input));

  return {
    results,
    query,
    page,
    total: data.total
  };
}

export async function trackUnsplashDownload(downloadLocation: string) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey || !downloadLocation.startsWith("https://api.unsplash.com/")) {
    return false;
  }

  const response = await fetch(downloadLocation, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1"
    },
    cache: "no-store"
  });

  return response.ok;
}
