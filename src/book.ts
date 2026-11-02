import type { Symbol } from "./engine";
export interface Level {
  price: number;
  size: number;
}
export interface Book {
  symbol: Symbol;
  time: number;
  receivedAt: number;
  bids: Level[];
  asks: Level[];
}
export function parseBook(raw: unknown, symbol: Symbol): Book | null {
  const v = raw as { coin?: string; time?: number; levels?: unknown[][] };
  if (
    v?.coin !== `xyz:${symbol}` ||
    !Number.isFinite(v.time) ||
    v.time! < 0 ||
    !Array.isArray(v.levels) ||
    v.levels.length !== 2 ||
    !Array.isArray(v.levels[0]) ||
    !Array.isArray(v.levels[1])
  )
    return null;
  const side = (rows: unknown[], direction: number) => {
    const map = new Map<number, number>();
    for (const row of rows.slice(0, 40)) {
      const x = row as { px?: string; sz?: string };
      const price = Number(x?.px),
        size = Number(x?.sz);
      if (
        !Number.isFinite(price) ||
        !Number.isFinite(size) ||
        price <= 0 ||
        size <= 0
      )
        continue;
      map.set(price, (map.get(price) ?? 0) + size);
    }
    return [...map]
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => (a.price - b.price) * direction);
  };
  const bids = side(v.levels[0], -1),
    asks = side(v.levels[1], 1);
  if (bids.length && asks.length && bids[0].price >= asks[0].price) return null;
  return { symbol, time: v.time!, receivedAt: Date.now(), bids, asks };
}
export function aggregate(
  levels: Level[],
  tick: number,
  side: "bid" | "ask",
  count = 6,
) {
  if (!(tick > 0)) return [];
  const map = new Map<number, number>();
  for (const l of levels) {
    const units = l.price / tick;
    const price = Number(
      (
        (side === "bid" ? Math.floor(units + 1e-8) : Math.ceil(units - 1e-8)) *
        tick
      ).toFixed(6),
    );
    if (price <= 0) continue;
    map.set(price, (map.get(price) ?? 0) + l.size);
  }
  let total = 0;
  return [...map]
    .map(([price, size]) => ({ price, size }))
    .sort((a, b) => (side === "bid" ? b.price - a.price : a.price - b.price))
    .slice(0, count)
    .map((l) => ({ ...l, total: (total += l.size) }));
}
export function exampleBook(symbol: Symbol, price: number, step: number): Book {
  const side = (direction: number) =>
    Array.from({ length: 20 }, (_, i) => ({
      price: Number((price + direction * (i + 1) * 0.02).toFixed(2)),
      size: Number(
        (
          2 +
          ((i * 17 + symbol.charCodeAt(0) + step * 3 + (direction + 1) * 7) %
            83) /
            3
        ).toFixed(3),
      ),
    }));
  return {
    symbol,
    time: step,
    receivedAt: Date.now(),
    bids: side(-1),
    asks: side(1),
  };
}
