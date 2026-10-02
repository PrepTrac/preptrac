import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardMetrics from "./DashboardMetrics";

describe("household coverage", () => {
  it("leads with food and water days and keeps water goals in gallons", () => {
    render(<DashboardMetrics stats={{ totalFoodDays: 45, useHouseholdCalculation: true, totalWaterDays: 14, totalWater: 56, useHouseholdForWater: true }} goals={{ foodGoalDays: 30, waterGoalGallons: 120 }} />);
    expect(screen.getByRole("heading", { name: "Food coverage" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Water coverage" })).toBeVisible();
    expect(screen.getByText("45 / 30 days")).toBeVisible();
    expect(screen.getByText("56 / 120 gallons")).toBeVisible();
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("aria-valuenow", "100");
  });
  it("labels fallback food and unavailable water rather than fabricating zero days", () => {
    render(<DashboardMetrics stats={{ totalFoodDays: 0, totalWater: 0 }} />);
    expect(screen.getByText(/Fallback estimate: recorded food quantity/)).toBeVisible();
    expect(screen.getByText("—")).toBeVisible();
    expect(screen.getByRole("link", { name: /Set up household/ })).toHaveAttribute("href", "/household");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
  it("does not create percentages for zero, negative or absent goals", () => {
    render(<DashboardMetrics stats={{ totalFoodDays: 0, totalWater: 0 }} goals={{ foodGoalDays: 0, waterGoalGallons: -1 }} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
  it("keeps zero household coverage explicit and source breakdowns touch-accessible", () => {
    render(<DashboardMetrics stats={{ totalFoodDays: 0, useHouseholdCalculation: true, totalWaterDays: 0, useHouseholdForWater: true, totalWater: 0, waterBreakdown: [{ name: "Bottles", quantity: 0, unit: "bottles", gallonsEquivalent: 0 }] }} />);
    expect(screen.queryByText("—")).toBeNull();
    const details = screen.getByText("Water source breakdown");
    fireEvent.click(details);
    expect(screen.getByText(/Bottles/)).toBeVisible();
  });
  it("keeps zero recorded water unavailable and directs an existing household to supplies", () => {
    render(<DashboardMetrics stats={{ totalWater: 0, householdDailyCalories: 4000 }} />);
    expect(screen.getByText("—")).toBeVisible();
    expect(screen.getByRole("link", { name: /Review recorded water supplies/ })).toHaveAttribute("href", "/inventory");
    expect(screen.queryByRole("link", { name: /Set up household/ })).toBeNull();
  });
  it("cycles all existing fuel units using a real button", () => {
    render(<DashboardMetrics stats={{ totalKwh: 48, batteryKwh: 12, totalFuelGallons: 6 }} />);
    const control = screen.getByRole("button", { name: /Switch fuel measurement/ });
    fireEvent.click(control);
    expect(screen.getByText("12")).toBeVisible();
    fireEvent.click(control);
    expect(screen.getByText("6")).toBeVisible();
    fireEvent.click(control);
    expect(screen.getByText("48")).toBeVisible();
  });
});
