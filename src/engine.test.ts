import { describe, it, expect } from "vitest";
import {
  cancel,
  close,
  FX,
  gross,
  metrics,
  newSession,
  submit,
  tick,
  validateTrade,
  type TradeInput,
  type Quote,
} from "./engine";
import { scenarioPrice } from "./engine";
const q: Quote = {
  symbol: "NVDA",
  price: 100,
  time: 1000,
  source: "test",
  maxLeverage: 20,
  fundingRate: 0.001,
  fundingInterval: 3600000,
};
const trade: TradeInput = {
  symbol: "NVDA",
  side: "long",
  margin: 100,
  leverage: 5,
  type: "market",
};
describe("isolated paper engine", () => {
  it("produces safe display values for incomplete forms", () => {
    expect(metrics({ ...trade, margin: 0 }, 100).liquidation).toBe(0);
    expect(metrics({ ...trade, margin: NaN }, 100).net).toBe(0);
  });
  it("checks crossing limit fees against available cash", () => {
    const s = { ...newSession(), cash: 100.15 };
    expect(() =>
      submit(s, { ...trade, type: "limit", limit: 110 }, q, 1000),
    ).toThrow("Not enough");
  });
  it("runs the complete adverse scenario through modeled liquidation", () => {
    const p = { ...trade, leverage: 20 };
    let s = submit(newSession(), p, { ...q, price: 186.42 }, 1000);
    for (let step = 1; step <= 120; step++)
      s = tick(s, {
        ...q,
        price: scenarioPrice("NVDA", step, "shock"),
        time: 1000 + step * 30000,
      });
    expect(s.positions).toHaveLength(0);
    expect(s.events.filter((e) => e.kind === "Liquidated")).toHaveLength(1);
  });
  it("calculates directional gross, fees and conversion", () => {
    expect(metrics(trade, 100, 110).gross).toBe(50);
    expect(metrics({ ...trade, side: "short" }, 100, 90).gross).toBe(50);
    expect(metrics(trade, 100, 110).net).toBeCloseTo(49.475);
    expect(100 * FX).toBe(9000);
  });
  it("validates malformed, too small, excessive and insufficient inputs", () => {
    expect(validateTrade({ ...trade, margin: NaN }, 100, 1000)).toBeTruthy();
    expect(validateTrade({ ...trade, margin: 0 }, 100, 1000)).toBeTruthy();
    expect(validateTrade({ ...trade, margin: 0.001 }, 100, 1000)).toBeTruthy();
    expect(validateTrade({ ...trade, leverage: 21 }, 100, 1000)).toBeTruthy();
    expect(validateTrade(trade, 100, 100)).toContain("Not enough");
    expect(validateTrade({ ...trade, sl: 101 }, 100, 1000)).toBeTruthy();
  });
  it("reserves and releases pending limit margin including fee", () => {
    const s = newSession(),
      o = submit(s, { ...trade, type: "limit", limit: 90 }, q, 1000);
    expect(o.positions).toHaveLength(0);
    expect(o.cash).toBeCloseTo(s.cash - 100.1);
    expect(cancel(o, o.orders[0].id).cash).toBeCloseTo(s.cash);
  });
  it("fills a resting order once at a better crossed quote", () => {
    let s = submit(
      newSession(),
      { ...trade, type: "limit", limit: 90 },
      q,
      1000,
    );
    s = tick(s, { ...q, price: 89, time: 2000 });
    expect(s.orders).toHaveLength(0);
    expect(s.positions[0].entry).toBe(89);
    expect(s.positions[0].openingFee).toBeCloseTo(0.1);
    expect(tick(s, { ...q, price: 89, time: 2000 })).toBe(s);
    expect(tick(s, { ...q, price: 88, time: 1500 })).toBe(s);
  });
  it("treats crossing limits as takers", () => {
    const s = submit(
      newSession(),
      { ...trade, type: "limit", limit: 110 },
      q,
      1000,
    );
    expect(s.positions[0].openingFee).toBe(0.25);
  });
  it("partial closes keep proportional margin, fees and funding", () => {
    let s = submit(newSession(), trade, q, 1000);
    s = tick(s, { ...q, time: 3601000 });
    expect(s.positions[0].funding).toBe(0.5);
    const id = s.positions[0].id;
    s = close(s, id, 110, 3602000, 0.5, "Partial close");
    expect(s.positions[0].quantity).toBe(2.5);
    expect(s.positions[0].margin).toBe(50);
    expect(s.positions[0].funding).toBe(0.25);
    s = close(s, id, 110, 3603000);
    expect(s.positions).toHaveLength(0);
    expect(s.cash - newSession().cash).toBeCloseTo(48.975);
  });
  it("funding changes sign for shorts and negative rates", () => {
    let s = submit(newSession(), { ...trade, side: "short" }, q, 1000);
    s = tick(s, { ...q, time: 3601000 });
    expect(s.positions[0].funding).toBe(-0.5);
    s = submit(newSession(), trade, { ...q, fundingRate: -0.001 }, 1000);
    expect(tick(s, { ...q, time: 3601000 }).positions[0].funding).toBe(-0.5);
  });
  it("liquidates at the modeled boundary and never returns a negative balance", () => {
    let s = submit(newSession(), { ...trade, leverage: 20 }, q, 1000);
    const liq = metrics({ ...trade, leverage: 20 }, 100).liquidation;
    s = tick(s, { ...q, price: liq - 0.001, time: 2000 });
    expect(s.positions).toHaveLength(0);
    expect(s.events[0].kind).toBe("Liquidated");
    expect(s.cash).toBeGreaterThanOrEqual(0);
    let gap = submit(newSession(), trade, q, 1000);
    gap = tick(gap, { ...q, price: 1, time: 2000 });
    expect(gap.events[0].pnl).toBeCloseTo(-100.25);
  });
  it("triggers exits once and cancels remaining attached exits", () => {
    let s = submit(newSession(), { ...trade, tp: 110, sl: 95 }, q, 1000);
    s = tick(s, { ...q, price: 111, time: 2000 });
    expect(s.positions).toHaveLength(0);
    expect(s.events[0].kind).toBe("Take profit");
    expect(tick(s, { ...q, price: 94, time: 3000 }).events).toHaveLength(2);
  });
  it("rejects invalid quotes and isolated session mutation", () => {
    const s = newSession();
    expect(tick(s, { ...q, price: NaN })).toBe(s);
    expect(tick(s, { ...q, price: -1 })).toBe(s);
    const other = newSession();
    submit(s, trade, q, 1000);
    expect(other.cash).toBe(s.cash);
    expect(s.positions).toHaveLength(0);
  });
  it("does not introduce a material precision error on many partial closes", () => {
    let s = submit(newSession(), trade, q, 1000);
    const id = s.positions[0].id;
    for (let i = 0; i < 10; i++) s = close(s, id, 100, 2000 + i, 0.5);
    s = close(s, id, 100, 3000);
    expect(s.cash - newSession().cash).toBeCloseTo(-0.5, 8);
  });
});

it("explains the TSLA hedge screenshot: positive gross can remain negative after fees", () => {
  const long = metrics({ ...trade, symbol: "TSLA", margin: 10000 / FX, leverage: 10 }, 397.52, 397.73);
  const short = metrics({ ...trade, symbol: "TSLA", side: "short", margin: 10000 / FX, leverage: 10 }, 397.51, 397.73);
  expect(long.gross * FX).toBeCloseTo(52.8275, 2);
  expect(long.net * FX).toBeCloseTo(-47.20, 2);
  expect(short.net * FX).toBeCloseTo(-155.37, 2);
});
