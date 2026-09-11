import { describe, expect, it } from "vitest";
import { createRandomChallenge, getDailyChallenge } from "@/lib/challenges";

describe("createRandomChallenge", () => {
  it("returns a deterministic challenge when a random source is supplied", () => {
    const challenge = createRandomChallenge(() => 0);

    expect(challenge.subject).toBe("an old pair of sneakers viewed from above");
    expect(challenge.description).toContain("Beginner");
    expect(challenge.durationMinutes).toBe(15);
  });
});

describe("getDailyChallenge", () => {
  it("returns the same challenge for the same date", () => {
    const date = new Date("2026-09-11T10:00:00Z");

    expect(getDailyChallenge(date)).toEqual(getDailyChallenge(date));
  });

  it("can return different challenges across dates", () => {
    expect(getDailyChallenge(new Date("2026-09-11T10:00:00Z")).subject).not.toBe(
      getDailyChallenge(new Date("2026-09-12T10:00:00Z")).subject
    );
  });
});
