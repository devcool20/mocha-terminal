import { describe, expect, it } from "vitest";
import { sessionSchema } from "./store";
import { newSession, submit, type Quote } from "./engine";
describe("persisted session validation", () => {
  it("accepts a valid wallet and rejects missing or malformed state", () => {
    expect(sessionSchema.safeParse(newSession()).success).toBe(true);
    expect(sessionSchema.safeParse({ cash: 12, positions: [] }).success).toBe(
      false,
    );
    expect(sessionSchema.safeParse({ ...newSession(), cash: -1 }).success).toBe(
      false,
    );
  });
  it("checks nested position data instead of trusting saved JSON", () => {
    const q: Quote = {
      symbol: "NVDA",
      price: 100,
      time: 1,
      source: "test",
      maxLeverage: 20,
      fundingRate: 0,
      fundingInterval: 3600000,
    };
    const s = submit(
      newSession(),
      { symbol: "NVDA", side: "long", margin: 10, leverage: 5, type: "market" },
      q,
      1,
    );
    expect(sessionSchema.safeParse(s).success).toBe(true);
    expect(
      sessionSchema.safeParse({
        ...s,
        positions: [{ ...s.positions[0], quantity: Infinity }],
      }).success,
    ).toBe(false);
    expect(
      sessionSchema.safeParse({
        ...s,
        positions: [{ ...s.positions[0], symbol: "FAKE" }],
      }).success,
    ).toBe(false);
  });
});
