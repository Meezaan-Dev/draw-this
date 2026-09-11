import { describe, expect, it } from "vitest";
import { addRecentReference, getPreferences, getRecentReferences, getSavedReferences, removeSavedReference, savePreferences, saveReference } from "@/lib/storage";
import type { ReferenceImage } from "@/lib/types";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key)
  };
}

function reference(id: string): ReferenceImage {
  return {
    id: `unsplash:${id}`,
    provider: "unsplash",
    providerId: id,
    width: 1200,
    height: 800,
    alt: "Drawing reference",
    urls: {
      small: "https://images.unsplash.com/photo-small",
      regular: "https://images.unsplash.com/photo-regular",
      full: "https://images.unsplash.com/photo-full"
    },
    photographer: {
      name: "Artist",
      url: "https://unsplash.com/@artist"
    },
    attributionUrl: "https://unsplash.com/photos/example",
    downloadLocation: "https://api.unsplash.com/photos/example/download",
    sourceQuery: "shoe",
    category: "Objects",
    difficulty: "Beginner"
  };
}

describe("local reference storage", () => {
  it("deduplicates saved references by provider ID", () => {
    const storage = createMemoryStorage();

    saveReference(reference("one"), storage);
    saveReference(reference("one"), storage);

    expect(getSavedReferences(storage)).toHaveLength(1);
  });

  it("keeps recent references newest first", () => {
    const storage = createMemoryStorage();

    addRecentReference(reference("one"), storage);
    addRecentReference(reference("two"), storage);
    addRecentReference(reference("one"), storage);

    const recent = getRecentReferences(storage);
    expect(recent).toHaveLength(2);
    expect(recent[0].providerId).toBe("one");
  });

  it("removes saved references", () => {
    const storage = createMemoryStorage();
    const item = reference("one");

    saveReference(item, storage);
    removeSavedReference(item, storage);

    expect(getSavedReferences(storage)).toHaveLength(0);
  });

  it("persists sketch style preferences", () => {
    const storage = createMemoryStorage();

    savePreferences({ sketchStyle: "Charcoal" }, storage);

    expect(getPreferences(storage).sketchStyle).toBe("Charcoal");
  });
});
