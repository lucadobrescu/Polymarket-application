/** @vitest-environment jsdom */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "./api";

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage,
    configurable: true,
  });
}

describe("api client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("adds bearer token for protected requests", async () => {
    localStorage.setItem("auth_token", "jwt-token");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, userId: 1, marketId: 10, outcomeId: 5, amount: 25 }),
    } as Response);

    await api.placeBet(10, 5, 25);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt-token");
  });

  it("maps listMarkets response to markets + hasMore", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 10, title: "Test" }], hasMore: true }),
    } as Response);

    const result = await api.listMarkets("active", 2, 20, "date", "desc");

    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].id).toBe(10);
    expect(result.hasMore).toBe(true);
  });

  it("throws formatted validation errors from backend", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        errors: [
          { field: "amount", message: "Must be positive" },
          { field: "outcomeId", message: "Required" },
        ],
      }),
    } as Response);

    await expect(api.placeBet(1, 1, -1)).rejects.toThrow(
      "amount: Must be positive, outcomeId: Required",
    );
  });
});
