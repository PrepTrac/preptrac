import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AttentionList from "./AttentionList";
import type { RouterOutputs } from "~/utils/api";

const stats = {
  upcomingEvents: Array.from({ length: 8 }, (_, i) => ({ id: String(i), type: "rotation", title: `Check ${i}`, date: new Date("2026-11-01"), completed: false, itemId: null, item: null })),
  upcomingExpirations: [], needsMaintenance: [],
} as unknown as RouterOutputs["dashboard"]["getStats"];

describe("attention overview", () => {
  it("shows six rows and describes returned records rather than a complete count", () => {
    render(<AttentionList stats={stats} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText("8 returned checks")).toBeVisible();
    expect(screen.getByText(/Results may be capped/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Open calendar/ })).toHaveAttribute("href", "/calendar");
  });
  it("does not claim an empty window while low-stock checks failed", () => {
    render(<AttentionList stats={{ ...stats, upcomingEvents: [] }} error />);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByText("No checks in the displayed window.")).toBeNull();
  });
});
