import { searchReferences } from "@/lib/unsplash";
import type { Category, Difficulty } from "@/lib/types";

const validDifficulties = new Set<Difficulty>(["Beginner", "Intermediate", "Advanced"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") as Category | null;
  const rawDifficulty = searchParams.get("difficulty") as Difficulty | null;
  const difficulty = rawDifficulty && validDifficulties.has(rawDifficulty) ? rawDifficulty : "Beginner";
  const page = Number(searchParams.get("page") ?? "1");
  const excludeIds = searchParams.getAll("exclude");

  try {
    const response = await searchReferences({
      query,
      category: category ?? undefined,
      difficulty,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      excludeIds
    });

    return Response.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search references.";
    return Response.json({ error: message }, { status: 502 });
  }
}
