import { trackUnsplashDownload } from "@/lib/unsplash";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { downloadLocation?: string } | null;

  if (!body?.downloadLocation) {
    return Response.json({ error: "downloadLocation is required" }, { status: 400 });
  }

  const tracked = await trackUnsplashDownload(body.downloadLocation);
  return Response.json({ tracked });
}
