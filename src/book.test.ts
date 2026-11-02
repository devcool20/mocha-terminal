import { describe, it, expect } from "vitest";
import { parseBook, aggregate, exampleBook } from "./book";
describe("order book snapshots", () => {
  const snapshot = {
    coin: "xyz:NVDA",
    time: 10,
    levels: [
      [
        { px: "100", sz: "2" },
        { px: "99.9", sz: "3" },
      ],
      [
        { px: "100.02", sz: "4" },
        { px: "100.1", sz: "5" },
      ],
    ],
  };
  it("validates symbol and prices and rejects crossed books", () => {
    expect(parseBook(snapshot, "NVDA")?.bids[0].price).toBe(100);
    expect(parseBook(snapshot, "TSLA")).toBeNull();
    expect(parseBook({ ...snapshot, time: NaN }, "NVDA")).toBeNull();
    expect(
      parseBook(
        { ...snapshot, levels: [[{ px: "101", sz: "1" }], snapshot.levels[1]] },
        "NVDA",
      ),
    ).toBeNull();
  });
  it("handles empty sides and filters nonfinite or zero values", () => {
    expect(parseBook({ ...snapshot, levels: [[], []] }, "NVDA")?.asks).toEqual(
      [],
    );
    expect(
      parseBook(
        {
          ...snapshot,
          levels: [
            [
              { px: "NaN", sz: "1" },
              { px: "100", sz: "0" },
            ],
            [],
          ],
        },
        "NVDA",
      )?.bids,
    ).toEqual([]);
  });
  it("groups conservatively and preserves size and cumulative totals", () => {
    expect(parseBook({ ...snapshot, levels: [null, []] }, "NVDA")).toBeNull();
    const rows = aggregate(
      [
        { price: 100.02, size: 2 },
        { price: 100.04, size: 3 },
        { price: 99.91, size: 4 },
      ],
      0.1,
      "bid",
    );
    expect(rows[0].price).toBe(100);
    expect(rows[0].size).toBe(5);
    expect(rows[1].total).toBe(9);
    expect(aggregate([{ price: 100.02, size: 2 }], 0.1, "ask")[0].price).toBe(
      100.1,
    );
  });
  it("generates repeatable uncrossed scenario depth around the model quote", () => {
    const a = exampleBook("NVDA", 186.42, 20),
      b = exampleBook("NVDA", 186.42, 20);
    expect(a.bids).toEqual(b.bids);
    expect(a.bids[0].price).toBeLessThan(186.42);
    expect(a.asks[0].price).toBeGreaterThan(186.42);
  });
});
