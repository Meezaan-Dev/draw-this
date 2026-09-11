import { describe, expect, it } from "vitest";
import { buildReferenceQuery, getSaferPromptSuggestions, inferCategoryFromSubject, resolveSearchCategory } from "@/lib/reference-query";

describe("buildReferenceQuery", () => {
  it("combines natural language, category, and difficulty terms", () => {
    expect(
      buildReferenceQuery({
        query: "old car",
        category: "Vehicles",
        difficulty: "Beginner"
      })
    ).toContain("old car");
  });

  it("uses difficulty as a soft search preference", () => {
    const query = buildReferenceQuery({
      query: "street",
      category: "Perspective",
      difficulty: "Advanced"
    });

    expect(query).toContain("complex lighting");
    expect(query).toContain("street perspective");
  });

  it("infers likely categories from natural language subjects", () => {
    expect(inferCategoryFromSubject("hand holding a mug")).toBe("Hands");
    expect(inferCategoryFromSubject("old Cape Town shop")).toBe("Buildings");
    expect(inferCategoryFromSubject("running shoe")).toBe("Objects");
  });

  it("prefers inferred category over a conflicting selected category", () => {
    expect(resolveSearchCategory("hand holding a mug", "Vehicles")).toBe("Hands");
    expect(resolveSearchCategory("", "Vehicles")).toBe("Vehicles");
  });

  it("does not add contradictory category terms for inferred subjects", () => {
    const query = buildReferenceQuery({
      query: "hand holding a mug",
      category: "Vehicles",
      difficulty: "Beginner"
    });

    expect(query).toContain("hands close up");
    expect(query).not.toContain("vehicle");
  });

  it("suggests safer prompts near the resolved category", () => {
    const suggestions = getSaferPromptSuggestions("unknown hand study", "Vehicles");

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].category).toBe("Hands");
  });
});
