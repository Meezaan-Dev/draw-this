import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DrawThisApp } from "@/components/draw-this-app";
import { getDailyChallenge } from "@/lib/challenges";

describe("DrawThisApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders search controls and reference stage", () => {
    render(React.createElement(DrawThisApp));

    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Difficulty")).toBeInTheDocument();
    expect(screen.getByLabelText("Sketch Style")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Surprise Me" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quick prompt suggestions")).toBeInTheDocument();
    expect(screen.getByText("Quick prompts")).toBeInTheDocument();
    expect(screen.getByLabelText("Practice prompts")).toBeInTheDocument();
    expect(screen.getByText("Drawing of the day")).toBeInTheDocument();
    expect(screen.getByText("Original reference")).toBeInTheDocument();
    expect(screen.getByText("Sketch concept preview")).toBeInTheDocument();
    expect(screen.getByText("Preview filter, not AI generated")).toBeInTheDocument();
  });

  it("renders tooltips for controls and actions", () => {
    render(React.createElement(DrawThisApp));

    expect(screen.getByRole("tooltip", { name: "Describe what you want to draw" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "Guides the search when the subject is broad" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "Pick a random subject, difficulty, and duration" })).toBeInTheDocument();
  });

  it("lets users choose a difficulty", () => {
    render(React.createElement(DrawThisApp));

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "Advanced" } });

    expect(screen.getByLabelText("Difficulty")).toHaveValue("Advanced");
  });

  it("clear prompt resets the subject field", () => {
    render(React.createElement(DrawThisApp));

    fireEvent.click(screen.getByRole("button", { name: "hand holding a mug" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("hand holding a mug");
    expect(screen.getByRole("button", { name: /Clear prompt/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear prompt/i }));
    expect(screen.getByLabelText("Subject")).toHaveValue("");
  });

  it("drawing of the day applies subject, category, and difficulty", () => {
    const daily = getDailyChallenge();
    render(React.createElement(DrawThisApp));

    fireEvent.click(screen.getByTitle("Use today's deterministic drawing challenge"));

    expect(screen.getByLabelText("Subject")).toHaveValue(daily.subject);
    expect(screen.getByLabelText("Category")).toHaveValue(daily.category);
    expect(screen.getByLabelText("Difficulty")).toHaveValue(daily.difficulty);
  });

  it("shows safer prompt suggestions when search returns no results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], query: "odd hand idea", page: 1 })
      })
    );

    render(React.createElement(DrawThisApp));

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "odd hand idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Reference" }));

    await waitFor(() => expect(screen.getByLabelText("Safer prompt suggestions")).toBeInTheDocument());
    expect(within(screen.getByLabelText("Safer prompt suggestions")).getByRole("button", { name: "hand holding a mug" })).toBeInTheDocument();
  });
});
