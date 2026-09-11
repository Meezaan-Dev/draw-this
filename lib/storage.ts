import type { ReferenceImage, StoredPreferences } from "@/lib/types";

const SAVED_KEY = "draw-this:saved-references";
const RECENT_KEY = "draw-this:recent-references";
const PREFS_KEY = "draw-this:preferences";
const MAX_RECENT = 24;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const defaultPreferences: StoredPreferences = {
  difficulty: "Beginner",
  source: "real",
  sketchStyle: "Pencil",
  timerPreset: "Unlimited",
  lastQuery: ""
};

function getStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function readJson<T>(key: string, fallback: T, storage?: StorageLike): T {
  const store = getStorage(storage);

  if (!store) {
    return fallback;
  }

  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, storage?: StorageLike) {
  const store = getStorage(storage);
  if (!store) {
    return;
  }

  store.setItem(key, JSON.stringify(value));
}

function storageId(reference: ReferenceImage) {
  return `${reference.provider}:${reference.providerId}`;
}

export function getSavedReferences(storage?: StorageLike) {
  return readJson<ReferenceImage[]>(SAVED_KEY, [], storage);
}

export function saveReference(reference: ReferenceImage, storage?: StorageLike) {
  const savedAt = new Date().toISOString();
  const nextReference = { ...reference, savedAt };
  const existing = getSavedReferences(storage).filter((item) => storageId(item) !== storageId(reference));
  const next = [nextReference, ...existing];
  writeJson(SAVED_KEY, next, storage);
  return next;
}

export function removeSavedReference(reference: ReferenceImage, storage?: StorageLike) {
  const next = getSavedReferences(storage).filter((item) => storageId(item) !== storageId(reference));
  writeJson(SAVED_KEY, next, storage);
  return next;
}

export function isReferenceSaved(reference: ReferenceImage, storage?: StorageLike) {
  return getSavedReferences(storage).some((item) => storageId(item) === storageId(reference));
}

export function getRecentReferences(storage?: StorageLike) {
  return readJson<ReferenceImage[]>(RECENT_KEY, [], storage);
}

export function addRecentReference(reference: ReferenceImage, storage?: StorageLike) {
  const viewedAt = new Date().toISOString();
  const nextReference = { ...reference, viewedAt };
  const existing = getRecentReferences(storage).filter((item) => storageId(item) !== storageId(reference));
  const next = [nextReference, ...existing].slice(0, MAX_RECENT);
  writeJson(RECENT_KEY, next, storage);
  return next;
}

export function getPreferences(storage?: StorageLike) {
  return {
    ...defaultPreferences,
    ...readJson<Partial<StoredPreferences>>(PREFS_KEY, {}, storage)
  };
}

export function savePreferences(preferences: Partial<StoredPreferences>, storage?: StorageLike) {
  const next = {
    ...getPreferences(storage),
    ...preferences
  };
  writeJson(PREFS_KEY, next, storage);
  return next;
}
