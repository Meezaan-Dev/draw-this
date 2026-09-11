export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Category =
  | "People"
  | "Faces"
  | "Hands"
  | "Animals"
  | "Objects"
  | "Buildings"
  | "Vehicles"
  | "Nature"
  | "Football"
  | "Food"
  | "Perspective"
  | "Landscapes"
  | "Random";

export type SourcePreference = "real";

export type SketchStyle = "Pencil" | "Ink" | "Charcoal" | "Construction";

export type SearchReferencesInput = {
  query: string;
  category?: Category;
  difficulty: Difficulty;
  page?: number;
  excludeIds?: string[];
};

export type ReferenceImage = {
  id: string;
  provider: "unsplash";
  providerId: string;
  width: number;
  height: number;
  color?: string;
  alt: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  photographer: {
    name: string;
    url: string;
  };
  attributionUrl: string;
  downloadLocation: string;
  sourceQuery: string;
  category?: Category;
  difficulty: Difficulty;
  savedAt?: string;
  viewedAt?: string;
};

export type SearchResponse = {
  results: ReferenceImage[];
  query: string;
  page: number;
  total?: number;
  warning?: string;
};

export type DrawingChallenge = {
  subject: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  durationMinutes: 2 | 5 | 10 | 15 | 30;
};

export type StoredPreferences = {
  difficulty: Difficulty;
  source: SourcePreference;
  sketchStyle: SketchStyle;
  timerPreset: "2" | "5" | "10" | "15" | "30" | "Unlimited";
  lastQuery: string;
  lastCategory?: Category;
};
