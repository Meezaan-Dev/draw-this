import type { Category, Difficulty } from "@/lib/types";

export const categories: Category[] = [
  "People",
  "Faces",
  "Hands",
  "Animals",
  "Objects",
  "Buildings",
  "Vehicles",
  "Nature",
  "Football",
  "Food",
  "Perspective",
  "Landscapes",
  "Random"
];

export const difficulties: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export const guidedPromptSuggestions: Array<{ subject: string; category: Category; difficulty: Difficulty }> = [
  { subject: "hand holding a mug", category: "Hands", difficulty: "Intermediate" },
  { subject: "old Cape Town corner shop", category: "Buildings", difficulty: "Intermediate" },
  { subject: "running shoe", category: "Objects", difficulty: "Beginner" },
  { subject: "human side profile", category: "Faces", difficulty: "Beginner" },
  { subject: "sleeping cat on a chair", category: "Animals", difficulty: "Beginner" },
  { subject: "bicycle leaning against a wall", category: "Vehicles", difficulty: "Intermediate" },
  { subject: "bowl of fruit on a table", category: "Food", difficulty: "Beginner" },
  { subject: "narrow alley perspective", category: "Perspective", difficulty: "Advanced" },
  { subject: "mountain path with trees", category: "Landscapes", difficulty: "Intermediate" }
];

const categoryTerms: Record<Category, string[]> = {
  People: ["person pose", "figure drawing"],
  Faces: ["portrait face", "head study"],
  Hands: ["hands close up", "hand gesture"],
  Animals: ["animal reference", "wildlife"],
  Objects: ["still life object", "simple object"],
  Buildings: ["building facade", "architecture"],
  Vehicles: ["vehicle", "car"],
  Nature: ["plant nature", "tree"],
  Football: ["football player", "soccer player"],
  Food: ["food still life", "fruit"],
  Perspective: ["street perspective", "interior perspective"],
  Landscapes: ["landscape", "scenery"],
  Random: ["drawing reference"]
};

const categoryKeywords: Record<Exclude<Category, "Random">, string[]> = {
  People: ["person", "people", "body", "figure", "pose", "gesture", "dancer", "runner"],
  Faces: ["face", "portrait", "profile", "head", "expression", "eyes", "nose", "mouth"],
  Hands: ["hand", "hands", "finger", "fingers", "holding", "grip", "mug"],
  Animals: ["cat", "dog", "bird", "animal", "wildlife", "horse", "fish", "sleeping cat"],
  Objects: ["shoe", "sneaker", "cup", "mug", "bottle", "chair", "lamp", "object", "still life"],
  Buildings: ["building", "shop", "store", "corner shop", "street corner", "house", "cottage", "architecture", "facade"],
  Vehicles: ["car", "vehicle", "bicycle", "bike", "truck", "bus", "motorcycle"],
  Nature: ["plant", "tree", "flower", "leaf", "nature", "branch"],
  Football: ["football", "soccer", "player", "kick", "goalkeeper"],
  Food: ["food", "fruit", "bowl", "apple", "bread", "meal"],
  Perspective: ["perspective", "alley", "room", "interior", "street view", "vanishing"],
  Landscapes: ["landscape", "mountain", "path", "scenery", "field", "river", "beach"]
};

const difficultyTerms: Record<Difficulty, string[]> = {
  Beginner: ["simple background", "clear silhouette", "single subject"],
  Intermediate: ["interesting shapes", "moderate detail", "perspective"],
  Advanced: ["complex lighting", "detailed scene", "dynamic pose"]
};

export function inferCategoryFromSubject(subject: string): Category | undefined {
  const normalized = subject.toLowerCase().trim();

  if (!normalized) {
    return undefined;
  }

  let bestMatch: { category: Category; score: number } | undefined;

  for (const [category, keywords] of Object.entries(categoryKeywords) as Array<[Exclude<Category, "Random">, string[]]>) {
    const score = keywords.reduce((total, keyword) => {
      const matches = keyword.includes(" ")
        ? normalized.includes(keyword)
        : new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(normalized);

      return matches ? total + keyword.length : total;
    }, 0);

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score };
    }
  }

  return bestMatch?.category;
}

export function resolveSearchCategory(subject: string, selectedCategory?: Category): Category | undefined {
  const trimmedSubject = subject.trim();
  const inferred = inferCategoryFromSubject(trimmedSubject);

  if (!trimmedSubject) {
    return selectedCategory === "Random" ? undefined : selectedCategory;
  }

  if (inferred) {
    return inferred;
  }

  return selectedCategory === "Random" ? undefined : selectedCategory;
}

export function buildReferenceQuery({
  query,
  category,
  difficulty
}: {
  query: string;
  category?: Category;
  difficulty: Difficulty;
}) {
  const trimmedQuery = query.trim();
  const terms = new Set<string>();
  const searchCategory = resolveSearchCategory(trimmedQuery, category);

  if (trimmedQuery) {
    terms.add(trimmedQuery);
  }

  if (searchCategory && searchCategory !== "Random") {
    categoryTerms[searchCategory].forEach((term) => terms.add(term));
  }

  difficultyTerms[difficulty].forEach((term) => terms.add(term));

  if (!terms.size) {
    categoryTerms.Random.forEach((term) => terms.add(term));
  }

  return Array.from(terms).join(" ");
}

export function getSaferPromptSuggestions(subject: string, category?: Category, limit = 3) {
  const inferred = inferCategoryFromSubject(subject);
  const resolvedCategory = inferred ?? (category === "Random" ? undefined : category);
  const normalizedSubject = subject.toLowerCase().trim();
  const suggestions = guidedPromptSuggestions.filter((suggestion) => {
    if (normalizedSubject && suggestion.subject.toLowerCase() === normalizedSubject) {
      return false;
    }

    return resolvedCategory ? suggestion.category === resolvedCategory : true;
  });

  return (suggestions.length ? suggestions : guidedPromptSuggestions).slice(0, limit);
}
