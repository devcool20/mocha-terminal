import Decimal from "decimal.js";
import { z } from "zod";
export const FX = 90,
  INITIAL = 100000 / FX,
  TAKER = 0.0005,
  MAKER = 0.0002,
  MAINTENANCE = 0.005;
export const assets = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    price: 186.42,
    change: 2.34,
    color: "#8fb855",
    letter: "N",
    maxLeverage: 20,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    price: 428.75,
    change: -1.28,
    color: "#d87971",
    letter: "T",
    maxLeverage: 20,
  },
  {
    symbol: "AAPL",
    name: "Apple",
    price: 271.49,
    change: 0.86,
    color: "#b8b9bb",
    letter: "A",
    maxLeverage: 20,
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    price: 642.85,
    change: 1.72,
    color: "#7ba4d3",
    letter: "M",
    maxLeverage: 20,
  },
] as const;
export type Symbol = (typeof assets)[number]["symbol"];
export type Side = "long" | "short";
export type Mode = "scenario" | "live";
export interface ContractSettings {
  maxLeverage: number;
  fundingRate: number;
  fundingInterval: number;
  maintenance: number;
}
export interface Quote {
  symbol: Symbol;
  price: number;
  time: number;
  source: string;
  maxLeverage: number;
  fundingRate: number;
  fundingInterval: number;
}
export interface TradeInput {
  symbol: Symbol;
  side: Side;
  margin: number;
  leverage: number;
  type: "market" | "limit";
  limit?: number;
  tp?: number;
  sl?: number;
}
export interface Position extends TradeInput {
  id: string;
  entry: number;
  quantity: number;
  openingFee: number;
  funding: number;
  openedAt: number;
  lastFunding: number;
  fundingInterval: number;
  fundingRate: number;
}
export interface PaperOrder extends TradeInput {
  id: string;
  createdAt: number;
  reserve: number;
}
export interface LedgerEvent {
  id: string;
  time: number;
  symbol: Symbol;
  side: Side;
  kind: string;
  price: number;
  quantity: number;
  pnl: number;
  fee: number;
  funding: number;
  margin: number;
  entry: number;
  leverage: number;
}
export interface Session {
  cash: number;
  positions: Position[];
  orders: PaperOrder[];
  events: LedgerEvent[];
  lastTicks: Partial<Record<Symbol, number>>;
}
export const newSession = (): Session => ({
  cash: INITIAL,
  positions: [],
  orders: [],
  events: [],
  lastTicks: {},
});
const n = (v: Decimal.Value) => new Decimal(v);
export const round = (v: number) => Number(n(v).toSignificantDigits(14));
export function gross(
  p: Pick<Position, "side" | "entry" | "quantity">,
  price: number,
) {
  return n(price)
    .minus(p.entry)
    .mul(p.quantity)
    .mul(p.side === "long" ? 1 : -1)
    .toNumber();
}
export function metrics(
  input: TradeInput,
  entry: number,
  exit = entry,
  funding = 0,
) {
  if (
    !Number.isFinite(input.margin) ||
    input.margin <= 0 ||
    !Number.isFinite(entry) ||
    entry <= 0 ||
    !Number.isFinite(exit) ||
    exit <= 0
  )
    return {
      notional: 0,
      quantity: 0,
      openFee: 0,
      closeFee: 0,
      gross: 0,
      net: 0,
      liquidation: 0,
    };
  const notional = n(input.margin).mul(input.leverage).toNumber();
  const quantity = n(notional).div(entry).toNumber();
  const openFee = notional * (input.type === "limit" ? MAKER : TAKER),
    closeFee = quantity * exit * TAKER;
  const pnl = gross({ ...input, entry, quantity }, exit);
  const d = input.side === "long" ? 1 : -1;
  const liquidation =
    (d * quantity * entry - input.margin + funding) /
    (quantity * (d - MAINTENANCE - TAKER));
  return {
    notional,
    quantity,
    openFee,
    closeFee,
    gross: pnl,
    net: pnl - openFee - closeFee - funding,
    liquidation: Math.max(0, liquidation),
  };
}
export const tradeSchema = z.object({
  symbol: z.enum(["NVDA", "TSLA", "AAPL", "META"]),
  side: z.enum(["long", "short"]),
  margin: z.number().finite().positive().max(10000000),
  leverage: z.number().int().min(1).max(50),
  type: z.enum(["market", "limit"]),
  limit: z.number().finite().positive().optional(),
  tp: z.number().finite().positive().optional(),
  sl: z.number().finite().positive().optional(),
});
export function validateTrade(
  input: TradeInput,
  price: number,
  cash: number,
  max = 20,
): string | null {
  if (!tradeSchema.safeParse(input).success)
    return "Enter valid, positive amounts. Margin must be at least ₹1.";
  if (input.margin * FX < 1) return "Minimum practice margin is ₹1.";
  if (!(price > 0) || !Number.isFinite(price))
    return "A valid quote is required.";
  if (input.leverage > max)
    return `This market supports up to ${max}× in this session.`;
  if (input.type === "limit" && !input.limit) return "Enter a limit price.";
  const crossing =
    input.type === "limit" &&
    (input.side === "long" ? price <= input.limit! : price >= input.limit!);
  const entry = input.type === "limit" && !crossing ? input.limit! : price;
  if (
    input.tp &&
    (input.side === "long" ? input.tp <= entry : input.tp >= entry)
  )
    return "Take profit must be on the profitable side of entry.";
  if (
    input.sl &&
    (input.side === "long" ? input.sl >= entry : input.sl <= entry)
  )
    return "Stop loss must be on the losing side of entry.";
  const m = metrics(
    { ...input, type: crossing ? "market" : input.type },
    entry,
  );
  if (
    input.sl &&
    (input.side === "long"
      ? input.sl <= m.liquidation
      : input.sl >= m.liquidation)
  )
    return "Place your stop loss before the estimated liquidation level.";
  if (input.margin + m.openFee > cash + 1e-9)
    return "Not enough virtual funds for margin and opening fee.";
  return null;
}
const uid = () => crypto.randomUUID();
function fill(
  s: Session,
  input: TradeInput,
  price: number,
  time: number,
  quote: Quote,
): Session {
  const m = metrics(input, price);
  const p: Position = {
    ...input,
    id: uid(),
    entry: price,
    quantity: m.quantity,
    openingFee: m.openFee,
    funding: 0,
    openedAt: time,
    lastFunding: time,
    fundingRate: quote.fundingRate,
    fundingInterval: quote.fundingInterval,
  };
  const e: LedgerEvent = {
    id: uid(),
    time,
    symbol: input.symbol,
    side: input.side,
    kind: "Opened",
    price,
    quantity: m.quantity,
    pnl: 0,
    fee: m.openFee,
    funding: 0,
    margin: input.margin,
    entry: price,
    leverage: input.leverage,
  };
  return {
    ...s,
    cash: round(s.cash - input.margin - m.openFee),
    positions: [...s.positions, p],
    events: [e, ...s.events].slice(0, 300),
  };
}
export function submit(
  s: Session,
  input: TradeInput,
  quote: Quote,
  time: number,
): Session {
  const error = validateTrade(input, quote.price, s.cash, quote.maxLeverage);
  if (error) throw new Error(error);
  const crosses =
    input.type === "market" ||
    (input.side === "long"
      ? quote.price <= input.limit!
      : quote.price >= input.limit!);
  if (crosses) {
    const actual = { ...input, type: "market" as const };
    const actualError = validateTrade(
      actual,
      quote.price,
      s.cash,
      quote.maxLeverage,
    );
    if (actualError) throw new Error(actualError);
    return fill(s, actual, quote.price, time, quote);
  }
  const reserve = input.margin + metrics(input, input.limit!).openFee;
  return {
    ...s,
    cash: round(s.cash - reserve),
    orders: [...s.orders, { ...input, id: uid(), createdAt: time, reserve }],
  };
}
export function cancel(s: Session, id: string): Session {
  const o = s.orders.find((o) => o.id === id);
  return o
    ? {
        ...s,
        cash: round(s.cash + o.reserve),
        orders: s.orders.filter((o) => o.id !== id),
      }
    : s;
}
export function close(
  s: Session,
  id: string,
  price: number,
  time: number,
  fraction = 1,
  reason = "Closed",
): Session {
  const p = s.positions.find((p) => p.id === id);
  if (!p || !(fraction > 0 && fraction <= 1) || !(price > 0)) return s;
  const qty = p.quantity * fraction,
    margin = p.margin * fraction,
    funding = p.funding * fraction,
    g = gross({ ...p, quantity: qty }, price),
    fee = qty * price * TAKER;
  const returned = Math.max(0, margin + g - funding - fee);
  const pnl = returned - margin - p.openingFee * fraction;
  const event: LedgerEvent = {
    id: uid(),
    time,
    symbol: p.symbol,
    side: p.side,
    kind: reason,
    price,
    quantity: qty,
    pnl,
    fee: fee + p.openingFee * fraction,
    funding,
    margin,
    entry: p.entry,
    leverage: p.leverage,
  };
  return {
    ...s,
    cash: round(s.cash + returned),
    positions:
      fraction === 1
        ? s.positions.filter((v) => v.id !== id)
        : s.positions.map((v) =>
            v.id === id
              ? {
                  ...v,
                  quantity: v.quantity * (1 - fraction),
                  margin: v.margin * (1 - fraction),
                  funding: v.funding * (1 - fraction),
                  openingFee: v.openingFee * (1 - fraction),
                }
              : v,
          ),
    events: [event, ...s.events].slice(0, 300),
  };
}
export function tick(session: Session, quote: Quote): Session {
  if (
    !Number.isFinite(quote.price) ||
    quote.price <= 0 ||
    quote.time <= (session.lastTicks[quote.symbol] ?? 0)
  )
    return session;
  let s: Session = {
    ...session,
    lastTicks: { ...session.lastTicks, [quote.symbol]: quote.time },
  };
  for (const o of [...s.orders])
    if (
      o.symbol === quote.symbol &&
      (o.side === "long" ? quote.price <= o.limit! : quote.price >= o.limit!)
    ) {
      s = cancel(s, o.id);
      s = fill(s, o, quote.price, quote.time, quote);
    }
  s = {
    ...s,
    positions: s.positions.map((p) => {
      if (p.symbol !== quote.symbol) return p;
      const periods = Math.floor(
        (quote.time - p.lastFunding) / p.fundingInterval,
      );
      return periods > 0
        ? {
            ...p,
            funding: round(
              p.funding +
                p.quantity *
                  quote.price *
                  p.fundingRate *
                  periods *
                  (p.side === "long" ? 1 : -1),
            ),
            lastFunding: p.lastFunding + periods * p.fundingInterval,
          }
        : p;
    }),
  };
  for (const p of [...s.positions]) {
    if (p.symbol !== quote.symbol) continue;
    const eq = p.margin + gross(p, quote.price) - p.funding;
    const liq = eq <= p.quantity * quote.price * (MAINTENANCE + TAKER);
    const sl =
      p.sl && (p.side === "long" ? quote.price <= p.sl : quote.price >= p.sl);
    const tp =
      p.tp && (p.side === "long" ? quote.price >= p.tp : quote.price <= p.tp);
    if (liq || sl || tp)
      s = close(
        s,
        p.id,
        quote.price,
        quote.time,
        1,
        liq ? "Liquidated" : sl ? "Stop loss" : "Take profit",
      );
  }
  return s;
}
export const scenarios = [
  {
    id: "steady",
    title: "Steady rise",
    subtitle: "NVDA · Long · 5×",
    symbol: "NVDA" as Symbol,
    side: "long" as Side,
    leverage: 5,
    description:
      "A 3.5% upward price path. Open a position, then play to evaluate it.",
    end: 0.035,
  },
  {
    id: "short",
    title: "TSLA pullback",
    subtitle: "TSLA · Short · 10×",
    symbol: "TSLA" as Symbol,
    side: "short" as Side,
    leverage: 10,
    description:
      "A pullback in Tesla. Explore a short position and the cost of getting the direction wrong.",
    end: -0.045,
  },
  {
    id: "funding",
    title: "48h funding",
    subtitle: "AAPL · Sideways · 48h",
    symbol: "AAPL" as Symbol,
    side: "long" as Side,
    leverage: 5,
    description:
      "Price barely moves for 48 hours. Funding and trading fees still affect your result.",
    end: 0.0004,
  },
  {
    id: "shock",
    title: "NVDA sell-off",
    subtitle: "NVDA · Long · 20×",
    symbol: "NVDA" as Symbol,
    side: "long" as Side,
    leverage: 20,
    description:
      "A sudden 9% drawdown. Watch the margin buffer shrink and the modeled square-off trigger.",
    end: -0.09,
  },
] as const;
export function scenarioPrice(symbol: Symbol, step: number, scenario: string) {
  const base = assets.find((a) => a.symbol === symbol)!.price;
  const sc = scenarios.find((s) => s.id === scenario)!;
  const x = Math.min(120, step) / 120;
  const move = symbol === sc.symbol ? sc.end : 0.012;
  return (
    base *
    (1 + move * x + Math.sin(x * Math.PI * 8) * 0.0018 * Math.sin(x * Math.PI))
  );
}
