/** @vitest-environment jsdom */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { MarketCard } from "./market-card";
import type { Market } from "@/lib/api";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

function makeMarket(status: "active" | "resolved"): Market {
  return {
    id: 10,
    title: "Will this card align?",
    description: "Test market",
    status,
    creator: { username: "creator" },
    totalMarketBets: 300,
    participants: 4,
    outcomes: [
      { id: 1, title: "Yes", odds: 60, totalBets: 180 },
      { id: 2, title: "No", odds: 40, totalBets: 120 },
    ],
  };
}

describe("MarketCard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("renders card with full-height flex layout for aligned footer row", () => {
    const { container } = render(<MarketCard market={makeMarket("active")} />);

    const cardRoot = container.firstElementChild;
    expect(cardRoot?.className).toContain("h-full");
    expect(cardRoot?.className).toContain("flex");
    expect(cardRoot?.className).toContain("flex-col");
  });

  it("navigates to market details when action button is clicked", () => {
    render(<MarketCard market={makeMarket("active")} />);

    fireEvent.click(screen.getByRole("button", { name: "Place Bet" }));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/markets/10" });
  });

  it("shows resolved label for resolved markets", () => {
    render(<MarketCard market={makeMarket("resolved")} />);

    expect(screen.getByRole("button", { name: "View Results" })).toBeDefined();
  });
});
